package expo.modules.glimpsemedia

import android.content.Context
import android.database.Cursor.FIELD_TYPE_NULL
import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.os.CancellationSignal
import android.os.OperationCanceledException
import android.os.Process
import android.provider.MediaStore
import android.util.Log
import android.util.Size
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.util.Collections
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import kotlin.math.max
import kotlin.math.roundToInt

class GlimpseMediaModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val thumbDir: File by lazy {
    File(context.cacheDir, "vthumbs").apply { mkdirs() }
  }

  private val resolvedPaths = ConcurrentHashMap<String, String>()
  private val failedKeys: MutableSet<String> =
    Collections.newSetFromMap(ConcurrentHashMap<String, Boolean>())
  private val inFlight = ConcurrentHashMap<String, MutableList<Promise>>()
  private val activeSignals = ConcurrentHashMap<String, CancellationSignal>()

  private val thumbExecutor = Executors.newFixedThreadPool(3) { runnable ->
    Thread({
      Process.setThreadPriority(Process.THREAD_PRIORITY_BACKGROUND)
      runnable.run()
    }, "GlimpseThumbWorker").apply { isDaemon = true }
  }

  override fun definition() = ModuleDefinition {
    Name("GlimpseMedia")

    AsyncFunction("getVideoThumbnail") { id: String, uriString: String, maxSize: Int, promise: Promise ->
      extractVideoThumbnailAsync(id, uriString, maxSize, promise)
    }

    Function("cancelVideoThumbnail") { id: String, maxSize: Int ->
      val clampedSize = maxSize.coerceIn(128, 768)
      val key = buildCacheKey(id, clampedSize)
      activeSignals[key]?.cancel()
    }

    AsyncFunction("getAlbumsFast") Coroutine { ->
      queryAlbumsFast()
    }
  }

  private fun buildCacheKey(id: String, clampedSize: Int): String {
    val safeId = id.replace(Regex("[^A-Za-z0-9_-]"), "_")
    return "${safeId}_${clampedSize}"
  }

  private fun extractVideoThumbnailAsync(
    id: String,
    uriString: String,
    maxSize: Int,
    promise: Promise
  ) {
    val clampedSize = maxSize.coerceIn(128, 768)
    val key = buildCacheKey(id, clampedSize)

    resolvedPaths[key]?.let { cachedUri ->
      promise.resolve(cachedUri)
      return
    }

    if (failedKeys.contains(key)) {
      promise.resolve(null)
      return
    }

    val diskFile = File(thumbDir, "$key.jpg")
    if (diskFile.exists() && diskFile.length() > 0L) {
      val fileUri = "file://${diskFile.absolutePath}"
      resolvedPaths[key] = fileUri
      promise.resolve(fileUri)
      return
    }

    var shouldSubmit = false
    synchronized(inFlight) {
      val list = inFlight[key]
      if (list != null) {
        list.add(promise)
      } else {
        inFlight[key] = mutableListOf(promise)
        shouldSubmit = true
      }
    }

    if (!shouldSubmit) {
      return
    }

    thumbExecutor.execute {
      val signal = CancellationSignal()
      activeSignals[key] = signal
      var resolved: String? = null
      var canceled = false

      try {
        if (diskFile.exists() && diskFile.length() > 0L) {
          resolved = "file://${diskFile.absolutePath}"
          resolvedPaths[key] = resolved
        } else {
          val bitmap = extractBitmap(Uri.parse(uriString), clampedSize, signal)
          if (bitmap != null) {
            try {
              writeScaledJpeg(bitmap, diskFile, clampedSize)
              if (diskFile.exists() && diskFile.length() > 0L) {
                resolved = "file://${diskFile.absolutePath}"
                resolvedPaths[key] = resolved
              }
            } finally {
              if (!bitmap.isRecycled) {
                bitmap.recycle()
              }
            }
          }
        }
      } catch (_: OperationCanceledException) {
        canceled = true
      } catch (t: Throwable) {
        Log.w(TAG, "Video thumbnail failed id=$id uri=$uriString err=${t.message}")
      } finally {
        activeSignals.remove(key, signal)
        if (resolved == null && !canceled) {
          failedKeys.add(key)
        }
        val waiters = synchronized(inFlight) { inFlight.remove(key) }
        waiters?.forEach { waiter ->
          waiter.resolve(resolved)
        }
      }
    }
  }

  private fun extractBitmap(uri: Uri, maxSize: Int, signal: CancellationSignal): Bitmap? {
    val ctx = context
    val rawUri = uri.toString()
    if (rawUri.endsWith(".mkv", ignoreCase = true)) {
      return null
    }
    if (uri.scheme == "content") {
      val mimeType = try {
        ctx.contentResolver.getType(uri)
      } catch (_: Throwable) {
        null
      }
      if (mimeType.equals("video/x-matroska", ignoreCase = true)) {
        return null
      }
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && uri.scheme == "content") {
      return try {
        ctx.contentResolver.loadThumbnail(uri, Size(maxSize, maxSize), signal)
      } catch (canceled: OperationCanceledException) {
        throw canceled
      } catch (_: Throwable) {
        null
      }
    }

    if (signal.isCanceled) {
      throw OperationCanceledException()
    }

    val retriever = MediaMetadataRetriever()
    return try {
      retriever.setDataSource(ctx, uri)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        retriever.getScaledFrameAtTime(
          -1L,
          MediaMetadataRetriever.OPTION_CLOSEST_SYNC,
          maxSize,
          maxSize
        ) ?: retriever.getFrameAtTime(-1L, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
      } else {
        retriever.getFrameAtTime(-1L, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
      }
    } catch (_: Throwable) {
      null
    } finally {
      try {
        retriever.release()
      } catch (_: Throwable) {
      }
    }
  }

  private fun writeScaledJpeg(source: Bitmap, target: File, maxSize: Int) {
    val maxDim = max(source.width, source.height)
    val scaled = if (maxDim > maxSize && maxDim > 0) {
      val ratio = maxSize.toFloat() / maxDim.toFloat()
      val targetW = max(1, (source.width * ratio).roundToInt())
      val targetH = max(1, (source.height * ratio).roundToInt())
      Bitmap.createScaledBitmap(source, targetW, targetH, true)
    } else {
      source
    }

    val tmp = File(target.parentFile, "${target.name}.tmp")
    try {
      FileOutputStream(tmp).use { out ->
        scaled.compress(Bitmap.CompressFormat.JPEG, 82, out)
        out.flush()
      }
      if (tmp.exists() && tmp.length() > 0L) {
        if (target.exists()) {
          target.delete()
        }
        tmp.renameTo(target)
      }
    } finally {
      if (tmp.exists()) {
        tmp.delete()
      }
      if (scaled !== source && !scaled.isRecycled) {
        scaled.recycle()
      }
    }
  }

  private suspend fun queryAlbumsFast(): List<Map<String, Any?>> = withContext(Dispatchers.IO) {
    val contentUri = MediaStore.Files.getContentUri("external")
    val projection = arrayOf(
      MediaStore.MediaColumns._ID,
      MediaStore.Images.Media.BUCKET_ID,
      MediaStore.Images.Media.BUCKET_DISPLAY_NAME,
      MediaStore.Files.FileColumns.MEDIA_TYPE,
      MediaStore.MediaColumns.DATE_MODIFIED,
      MediaStore.MediaColumns.DATE_TAKEN,
      MediaStore.MediaColumns.DATE_ADDED,
      MediaStore.MediaColumns.DATA
    )
    val selection =
      "${MediaStore.Files.FileColumns.MEDIA_TYPE} = ${MediaStore.Files.FileColumns.MEDIA_TYPE_IMAGE} OR " +
        "${MediaStore.Files.FileColumns.MEDIA_TYPE} = ${MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO}"

    val buckets = HashMap<String, BucketAccumulator>(64)

    context.contentResolver.query(
      contentUri,
      projection,
      selection,
      null,
      null
    )?.use { cursor ->
      coroutineContext.ensureActive()

      val idCol = cursor.getColumnIndex(MediaStore.MediaColumns._ID)
      val bucketIdCol = cursor.getColumnIndex(MediaStore.Images.Media.BUCKET_ID)
      val bucketNameCol = cursor.getColumnIndex(MediaStore.Images.Media.BUCKET_DISPLAY_NAME)
      val mediaTypeCol = cursor.getColumnIndex(MediaStore.Files.FileColumns.MEDIA_TYPE)
      val dateModCol = cursor.getColumnIndex(MediaStore.MediaColumns.DATE_MODIFIED)
      val dateTakenCol = cursor.getColumnIndex(MediaStore.MediaColumns.DATE_TAKEN)
      val dateAddedCol = cursor.getColumnIndex(MediaStore.MediaColumns.DATE_ADDED)
      val dataCol = cursor.getColumnIndex(MediaStore.MediaColumns.DATA)

      while (cursor.moveToNext()) {
        coroutineContext.ensureActive()
        if (
          idCol < 0 ||
          bucketIdCol < 0 ||
          bucketNameCol < 0 ||
          mediaTypeCol < 0 ||
          cursor.getType(bucketIdCol) == FIELD_TYPE_NULL ||
          cursor.getType(bucketNameCol) == FIELD_TYPE_NULL
        ) {
          continue
        }

        val bucketId = cursor.getString(bucketIdCol) ?: continue
        val bucketName = cursor.getString(bucketNameCol) ?: continue
        if (bucketName.isEmpty()) continue

        val assetIdLong = cursor.getLong(idCol)
        val mediaTypeInt = cursor.getInt(mediaTypeCol)
        val isVideo = mediaTypeInt == MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO

        val rawMod = if (dateModCol >= 0 && cursor.getType(dateModCol) != FIELD_TYPE_NULL) {
          normalizeEpochMs(cursor.getLong(dateModCol))
        } else 0L
        val rawTaken = if (dateTakenCol >= 0 && cursor.getType(dateTakenCol) != FIELD_TYPE_NULL) {
          normalizeEpochMs(cursor.getLong(dateTakenCol))
        } else 0L
        val rawAdded = if (dateAddedCol >= 0 && cursor.getType(dateAddedCol) != FIELD_TYPE_NULL) {
          normalizeEpochMs(cursor.getLong(dateAddedCol))
        } else 0L

        val timestamp = maxOf(rawTaken, rawMod, rawAdded)
        val rawData = if (!isVideo && dataCol >= 0 && cursor.getType(dataCol) != FIELD_TYPE_NULL) {
          cursor.getString(dataCol)
        } else null

        val acc = buckets.getOrPut(bucketId) {
          BucketAccumulator(id = bucketId, title = bucketName)
        }
        acc.count++

        if (
          acc.coverAssetIdLong < 0L ||
          timestamp > acc.latestTimestamp ||
          (timestamp == acc.latestTimestamp && assetIdLong > acc.coverAssetIdLong)
        ) {
          acc.latestTimestamp = timestamp
          acc.coverAssetIdLong = assetIdLong
          acc.coverIsVideo = isVideo
          acc.coverData = rawData
        }
      }
    }

    buckets.values.map { acc ->
      val assetIdStr = acc.coverAssetIdLong.toString()
      val coverUri = when {
        acc.coverAssetIdLong < 0L -> null
        acc.coverIsVideo -> "content://media/external/video/media/$assetIdStr"
        !acc.coverData.isNullOrBlank() -> "file://${acc.coverData}"
        else -> "content://media/external/images/media/$assetIdStr"
      }
      mapOf(
        "id" to acc.id,
        "title" to acc.title,
        "assetCount" to acc.count,
        "coverAssetId" to if (acc.coverAssetIdLong >= 0L) assetIdStr else null,
        "coverUri" to coverUri,
        "coverMediaType" to if (acc.coverIsVideo) "video" else "photo",
        "latestTimestamp" to acc.latestTimestamp.toDouble()
      )
    }
  }

  private fun normalizeEpochMs(raw: Long): Long {
    if (raw <= 0L) return 0L
    return if (raw < 100_000_000_000L) raw * 1000L else raw
  }

  private class BucketAccumulator(
    val id: String,
    val title: String,
    var count: Int = 0,
    var latestTimestamp: Long = -1L,
    var coverAssetIdLong: Long = -1L,
    var coverIsVideo: Boolean = false,
    var coverData: String? = null
  )

  companion object {
    private const val TAG = "GlimpseMedia"
  }
}

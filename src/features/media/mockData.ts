import { MediaItem, Album } from './types';

/**
 * Curated high quality photos and sample videos with varied aspect ratios,
 * realistic timestamps, and folder categorization for development in Expo Go.
 */

const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?w=800&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80',
  'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=800&q=80',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80',
  'https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?w=800&q=80',
  'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&q=80',
  'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=800&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80',
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&q=80',
  'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&q=80',
  'https://images.unsplash.com/photo-1504567961542-e24d9439a724?w=800&q=80',
  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&q=80',
  'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=800&q=80',
  'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?w=800&q=80',
];

const SAMPLE_VIDEOS = [
  {
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    duration: 15,
  },
  {
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    duration: 15,
  },
  {
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    duration: 60,
  },
  {
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    duration: 59,
  },
];

export const MOCK_ALBUMS: Album[] = [
  { id: 'album-camera', title: 'Camera', assetCount: 60 },
  { id: 'album-screenshots', title: 'Screenshots', assetCount: 24 },
  { id: 'album-whatsapp', title: 'WhatsApp Images', assetCount: 36 },
  { id: 'album-downloads', title: 'Downloads', assetCount: 18 },
];

export function generateMockMediaItems(): MediaItem[] {
  const items: MediaItem[] = [];
  const now = Date.now();
  const ONE_HOUR = 3600 * 1000;
  const ONE_DAY = 24 * ONE_HOUR;

  let globalIndex = 0;

  MOCK_ALBUMS.forEach((album) => {
    for (let i = 0; i < album.assetCount; i++) {
      globalIndex++;
      const isVideo = i % 7 === 0; // 1 in every 7 is a video
      const imageIndex = (globalIndex + i) % SAMPLE_IMAGES.length;
      const videoIndex = i % SAMPLE_VIDEOS.length;

      // Create realistic timestamps:
      // First 10: Today
      // Next 15: Yesterday
      // Next 25: 2 to 14 days ago
      // Rest: 1 to 6 months ago
      let creationTime: number;
      if (globalIndex <= 10) {
        creationTime = now - i * (2 * ONE_HOUR);
      } else if (globalIndex <= 25) {
        creationTime = now - ONE_DAY - (i % 8) * ONE_HOUR;
      } else if (globalIndex <= 50) {
        creationTime = now - (3 + (i % 12)) * ONE_DAY;
      } else {
        creationTime = now - (30 + (i % 120)) * ONE_DAY;
      }

      if (isVideo) {
        const video = SAMPLE_VIDEOS[videoIndex];
        items.push({
          id: `mock-video-${album.id}-${i}`,
          uri: video.uri,
          mediaType: 'video',
          width: 1920,
          height: 1080,
          duration: video.duration,
          creationTime,
          modificationTime: creationTime,
          filename: `VID_${new Date(creationTime).toISOString().slice(0, 10).replace(/-/g, '')}_${i}.mp4`,
          albumId: album.id,
        });
      } else {
        items.push({
          id: `mock-photo-${album.id}-${i}`,
          uri: SAMPLE_IMAGES[imageIndex],
          mediaType: 'photo',
          width: 2400,
          height: 1600,
          duration: 0,
          creationTime,
          modificationTime: creationTime,
          filename: `IMG_${new Date(creationTime).toISOString().slice(0, 10).replace(/-/g, '')}_${i}.jpg`,
          albumId: album.id,
        });
      }
    }
  });

  // Sort newest first
  return items.sort((a, b) => b.creationTime - a.creationTime);
}

export class MetadataParser {
  parseVideoInfo(videoInfo) {
    const metadata = {
      title: videoInfo.title || 'Unknown',
      artist: this.extractArtist(videoInfo),
      album: this.extractAlbum(videoInfo),
      date: this.extractDate(videoInfo),
      description: videoInfo.description || '',
      uploader: videoInfo.uploader || videoInfo.channel || 'YouTube',
      duration: videoInfo.duration || 0,
      url: videoInfo.webpage_url || ''
    };

    return metadata;
  }

  extractArtist(videoInfo) {
    const title = videoInfo.title || '';
    const uploader = videoInfo.uploader || '';
    const description = (videoInfo.description || '').substring(0, 500);

    // Pattern 1: "Artist - Song Title" 
    const dashPattern = title.match(/^([^-]+)\s*-\s*(.+)$/);
    if (dashPattern) {
      const possibleArtist = dashPattern[1].trim();
      // Filter out common non-artist patterns
      if (!this.isGenericTitle(possibleArtist)) {
        return possibleArtist;
      }
    }

    // Pattern 2: "Artist: Song Title"
    const colonPattern = title.match(/^([^:]+):\s*(.+)$/);
    if (colonPattern) {
      const possibleArtist = colonPattern[1].trim();
      if (!this.isGenericTitle(possibleArtist)) {
        return possibleArtist;
      }
    }

    // Pattern 3: Look for "Artist" or "Performed by" in description
    const artistFromDesc = this.extractArtistFromDescription(description);
    if (artistFromDesc) {
      return artistFromDesc;
    }

    // Pattern 4: Check if uploader looks like an artist name
    if (uploader && !this.isGenericUploader(uploader)) {
      return uploader;
    }

    // Pattern 5: Try to extract from common music video formats
    const musicPatterns = [
      /by\s+([^(\n]+)/i,
      /artist[:\s]+([^(\n]+)/i,
      /performed\s+by\s+([^(\n]+)/i
    ];

    for (const pattern of musicPatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        const artist = match[1].trim().replace(/[,.\n\r]+$/, '');
        if (!this.isGenericTitle(artist)) {
          return artist;
        }
      }
    }

    return videoInfo.uploader || 'Unknown Artist';
  }

  extractAlbum(videoInfo) {
    const description = (videoInfo.description || '').substring(0, 1000);
    const title = videoInfo.title || '';

    // Look for album information in description
    const albumPatterns = [
      /album[:\s]+([^(\n]+)/i,
      /from\s+(?:the\s+)?album[:\s]+([^(\n]+)/i,
      /from[:\s]+([^(\n]+)/i,
      /℗.*?(\d{4})/i  // Copyright year
    ];

    for (const pattern of albumPatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        const album = match[1].trim().replace(/[,.\n\r"']+$/, '');
        if (album.length > 2 && album.length < 100) {
          return album;
        }
      }
    }

    // Check if title contains album info in parentheses
    const titleAlbum = title.match(/\(([^)]+(?:album|EP|LP|single)[^)]*)\)/i);
    if (titleAlbum) {
      return titleAlbum[1].trim();
    }

    return videoInfo.uploader || 'YouTube';
  }

  extractDate(videoInfo) {
    // Try upload date first
    if (videoInfo.upload_date) {
      const dateStr = videoInfo.upload_date.toString();
      if (dateStr.length === 8) { // YYYYMMDD format
        return dateStr.substring(0, 4); // Return year
      }
    }

    // Look for year in description or title
    const description = (videoInfo.description || '') + ' ' + (videoInfo.title || '');
    const yearMatch = description.match(/(?:19|20)\d{2}/);
    if (yearMatch) {
      return yearMatch[0];
    }

    return new Date().getFullYear().toString();
  }

  extractArtistFromDescription(description) {
    const lines = description.split('\n').slice(0, 10); // Check first 10 lines
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines or lines that look like titles/headers
      if (!trimmed || trimmed.length < 3 || trimmed.includes('http') || trimmed.includes('www')) {
        continue;
      }

      // Look for artist patterns
      if (trimmed.match(/^(artist|performed by|by)[:\s]+/i)) {
        const artist = trimmed.replace(/^(artist|performed by|by)[:\s]+/i, '').trim();
        return this.cleanArtistName(artist);
      }

      // Check if line looks like an artist name (not too long, no special chars)
      if (trimmed.length < 50 && !trimmed.includes('©') && !trimmed.includes('℗')) {
        const words = trimmed.split(' ');
        if (words.length >= 1 && words.length <= 4) {
          return this.cleanArtistName(trimmed);
        }
      }
    }

    return null;
  }

  cleanArtistName(artist) {
    return artist
      .replace(/[,.\n\r"']+$/, '')
      .replace(/^\W+|\W+$/g, '')
      .trim();
  }

  isGenericTitle(text) {
    const generic = [
      'official', 'music', 'video', 'audio', 'lyrics', 'full', 'hd', 'hq',
      'live', 'concert', 'performance', 'session', 'acoustic', 'unplugged',
      'remix', 'cover', 'version', 'remaster', 'extended', 'radio', 'edit'
    ];
    
    const lower = text.toLowerCase();
    return generic.some(term => lower.includes(term)) || text.length < 2;
  }

  isGenericUploader(uploader) {
    const generic = [
      'vevo', 'records', 'music', 'official', 'entertainment', 'media',
      'productions', 'label', 'sounds', 'audio', 'tube', 'channel'
    ];
    
    const lower = uploader.toLowerCase();
    return generic.some(term => lower.includes(term));
  }

  // Clean up song title by removing common additions
  cleanTitle(title, artist) {
    let cleaned = title;

    // Remove artist name from beginning if it's there
    if (artist && artist !== 'Unknown Artist') {
      const artistRegex = new RegExp(`^${artist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-:]?\\s*`, 'i');
      cleaned = cleaned.replace(artistRegex, '');
    }

    // Remove common suffixes
    cleaned = cleaned.replace(/\s*\((official|music|audio|video|lyric|hd|hq).*?\)$/i, '');
    cleaned = cleaned.replace(/\s*\[(official|music|audio|video|lyric|hd|hq).*?\]$/i, '');
    
    // Remove year from title
    cleaned = cleaned.replace(/\s*\(?\d{4}\)?$/, '');

    return cleaned.trim() || title; // Return original if cleaning removes everything
  }
}
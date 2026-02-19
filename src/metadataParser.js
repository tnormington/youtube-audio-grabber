export class MetadataParser {
  parseVideoInfo(videoInfo) {
    return {
      title: videoInfo.title || 'Unknown',
      artist: this.extractArtist(videoInfo),
      album: this.extractAlbum(videoInfo),
      date: this.extractDate(videoInfo),
      description: videoInfo.description || '',
      uploader: videoInfo.uploader || videoInfo.channel || 'YouTube',
      duration: videoInfo.duration || 0,
      url: videoInfo.webpage_url || '',
    };
  }

  extractArtist(videoInfo) {
    const title = videoInfo.title || '';
    const description = videoInfo.description || '';

    // 1. "Artist - Song Title" in the video title
    const dashMatch = title.match(/^([^-–—]+)\s*[-–—]\s*(.+)$/);
    if (dashMatch) {
      const candidate = dashMatch[1].trim();
      if (!this._isClutter(candidate) && candidate.length >= 2) {
        return this._cleanName(candidate);
      }
    }

    // 2. Explicit labels in description
    const descArtist = this._scanDescription(description, [
      /^artist\s*:\s*(.+)/im,
      /^performed\s+by\s*:\s*(.+)/im,
      /^performed\s+by\s+(.+)/im,
      /^music\s+by\s*:\s*(.+)/im,
      /^written\s+(?:and\s+performed\s+)?by\s*:\s*(.+)/im,
      /^singer\s*:\s*(.+)/im,
      /^vocals?\s*:\s*(.+)/im,
    ]);
    if (descArtist) return descArtist;

    // 3. "Artist | Song Title" or "Artist ~ Song Title"
    const altSepMatch = title.match(/^([^|~]+)\s*[|~]\s*(.+)$/);
    if (altSepMatch) {
      const candidate = altSepMatch[1].trim();
      if (!this._isClutter(candidate) && candidate.length >= 2) {
        return this._cleanName(candidate);
      }
    }

    return '';
  }

  extractAlbum(videoInfo) {
    const description = videoInfo.description || '';
    const title = videoInfo.title || '';

    // 1. Explicit album labels in description
    const descAlbum = this._scanDescription(description, [
      /^album\s*:\s*(.+)/im,
      /^from\s+(?:the\s+)?album\s*[:\-–]\s*(.+)/im,
      /^(?:taken|off)\s+(?:the\s+)?(?:album|record|LP|EP)\s*[:\-–]\s*(.+)/im,
    ]);
    if (descAlbum) return descAlbum;

    // 2. Inline "from the album ..." in description
    const inlineAlbum = description.match(/from\s+(?:the\s+)?album\s+[""'']?([^""''\n]+)[""'']?/i);
    if (inlineAlbum) {
      const album = this._cleanName(inlineAlbum[1]);
      if (album.length > 1 && album.length < 100) return album;
    }

    // 3. Album info in parentheses in the title
    const titleAlbum = title.match(/\(([^)]*(?:album|EP|LP|single)[^)]*)\)/i);
    if (titleAlbum) return this._cleanName(titleAlbum[1]);

    return '';
  }

  extractDate(videoInfo) {
    const description = videoInfo.description || '';

    // 1. Explicit release year labels in description
    const descDate = this._scanDescription(description, [
      /^(?:release(?:d)?|year)\s*:\s*(.+)/im,
      /^released?\s+(?:on\s+)?(.+)/im,
    ]);
    if (descDate) {
      const year = descDate.match(/((?:19|20)\d{2})/);
      if (year) return year[1];
    }

    // 2. Copyright/phonographic lines (℗ 2021 or © 2021)
    const copyrightMatch = description.match(/[℗©]\s*((?:19|20)\d{2})/);
    if (copyrightMatch) return copyrightMatch[1];

    // 3. Any 4-digit year in description (first occurrence)
    const descYearMatch = description.match(/((?:19|20)\d{2})/);
    if (descYearMatch) return descYearMatch[1];

    // 4. Year in title (common for live recordings)
    const titleYearFull = (videoInfo.title || '').match(/((?:19|20)\d{2})/);
    if (titleYearFull) return titleYearFull[1];

    return '';
  }

  // Scan description lines for patterns, return first clean match
  _scanDescription(description, patterns) {
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        const value = this._cleanName(match[1]);
        if (value.length > 1 && value.length < 100 && !value.includes('http')) {
          return value;
        }
      }
    }
    return null;
  }

  _cleanName(text) {
    return text
      .replace(/[,.\n\r"']+$/, '')
      .replace(/^\W+|\W+$/g, '')
      .trim();
  }

  _isClutter(text) {
    const clutter = [
      'official', 'music video', 'audio', 'lyrics', 'lyric video',
      'full', 'hd', 'hq', '4k', 'remastered', 'remaster',
    ];
    const lower = text.toLowerCase().trim();
    return clutter.some((c) => lower === c) || text.length < 2;
  }

  cleanTitle(title, artist) {
    let cleaned = title;

    if (artist) {
      const escaped = artist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleaned = cleaned.replace(new RegExp(`^${escaped}\\s*[-–—:]\\s*`, 'i'), '');
    }

    cleaned = cleaned.replace(/\s*\(?(official|music|audio|video|lyric|hd|hq).*?\)?$/i, '');
    cleaned = cleaned.replace(/\s*\[.*?\]\s*$/i, '');

    return cleaned.trim() || title;
  }
}

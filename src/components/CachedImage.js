/**
 * Drop-in replacement for <Image source={{ uri: place.image }} />
 * that resolves to the local cached file when available.
 *
 * Shows "Powered by Google" attribution when the source URL is a
 * Google Places photo, as required by Google's Terms of Service.
 *
 * Usage:
 *   <CachedImage placeId={place.id} uri={place.image} style={styles.img} />
 */

import React, { useState, useEffect } from 'react';
import { Image, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { getCachedUri, downloadAndCache } from '../utils/imageCache';

const isGooglePlacesUrl = (url) =>
  typeof url === 'string' && url.includes('places.googleapis.com');

export default function CachedImage({ placeId, uri, style, resizeMode = 'cover', placeholder }) {
  const [resolvedUri, setResolvedUri] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      if (!uri || !placeId) {
        setLoading(false);
        return;
      }

      // 1. Check local cache first (instant, works offline)
      const local = await getCachedUri(placeId);
      if (!cancelled && local) {
        setResolvedUri(local);
        setLoading(false);
        return;
      }

      // 2. Not cached / expired — try to download now (requires internet)
      const downloaded = await downloadAndCache(placeId, uri);
      if (!cancelled) {
        if (downloaded) {
          setResolvedUri(downloaded);
        } else {
          // 3. Fallback: use remote URL directly (works if online, fails if offline)
          setResolvedUri(uri);
        }
        setLoading(false);
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, [placeId, uri]);

  if (!uri && !resolvedUri) {
    return placeholder || null;
  }

  if (loading) {
    return (
      <View style={[style, styles.centered, { backgroundColor: '#e8e8e8' }]}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

  if (!resolvedUri || error) {
    return placeholder || null;
  }

  return (
    <View style={style}>
      <Image
        source={{ uri: resolvedUri }}
        style={StyleSheet.absoluteFill}
        resizeMode={resizeMode}
        onError={() => setError(true)}
      />
      {isGooglePlacesUrl(uri) && (
        <View style={styles.attribution}>
          <Text style={styles.attributionText}>Powered by Google</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  attribution: {
    position: 'absolute',
    bottom: 4,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  attributionText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'System',
  },
});

import React, { useState, useEffect } from 'react';
import { Image, View, ActivityIndicator, StyleSheet } from 'react-native';
import { getCachedUri, downloadAndCache } from '../utils/imageCache';

export default function CachedImage({ placeId, uri, style, resizeMode = 'cover', resizeMethod = 'resize', placeholder }) {
  const [resolvedUri, setResolvedUri] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      if (!uri || !placeId) { setLoading(false); return; }

      const cached = await getCachedUri(placeId);
      if (!cancelled && cached) { setResolvedUri(cached); setLoading(false); return; }

      const downloaded = await downloadAndCache(placeId, uri);
      if (!cancelled) { setResolvedUri(downloaded || uri); setLoading(false); }
    }

    resolve();
    return () => { cancelled = true; };
  }, [placeId, uri]);

  if (loading) {
    return (
      <View style={[style, styles.centered]}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

  if (!resolvedUri || error) {
    return placeholder || null;
  }

  return (
    <Image
      source={{ uri: resolvedUri }}
      style={style}
      resizeMode={resizeMode}
      resizeMethod={resizeMethod}
      onError={() => setError(true)}
    />
  );
}

const styles = StyleSheet.create({
  centered: { backgroundColor: '#e8e8e8', justifyContent: 'center', alignItems: 'center' },
});

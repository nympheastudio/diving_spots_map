/**
 * DivingMapSimple 2026 – Leaflet dark theme + marqueurs premium
 */

import React, { useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const DivingMapSimple = ({ spots = [], markerSelected = null, onSpotPress, region, location }) => {
  const webViewRef = useRef(null);

  // HTML généré une seule fois (spots ne changent pas en runtime)
  const html = useCallback(() => {
    const markers = spots
      .filter(s => s?.latitude && s?.longitude)
      .map(s => ({
        id: s.id, lat: s.latitude, lng: s.longitude,
        nom: s.nom, localite: s.localite || '',
        profondeur: `${s.profondeur_min || 0}–${s.profondeur_max || 0} m`,
        difficulte: s.difficulte || '', visibilite: s.visibilite || '',
        type: s.type_site || '',
      }));

    const clat = region?.latitude  || 43.2965;
    const clng = region?.longitude || 5.3698;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{background:#080C14;}
  #map{width:100%;height:100vh;}

  /* Tile sombre – inversion CSS */
  .leaflet-tile{filter:invert(1) hue-rotate(200deg) brightness(0.78) saturate(0.85);}
  .leaflet-container{background:#080C14;}

  /* Popup */
  .leaflet-popup-content-wrapper{
    background:rgba(13,22,38,0.92);
    border:1px solid rgba(0,212,255,0.22);
    border-radius:16px;
    color:#F0F4FF;
    backdrop-filter:blur(12px);
    -webkit-backdrop-filter:blur(12px);
    box-shadow:0 8px 32px rgba(0,0,0,0.6);
    padding:0;overflow:hidden;
  }
  .leaflet-popup-tip{background:rgba(13,22,38,0.92);}
  .leaflet-popup-close-button{color:rgba(240,244,255,0.5)!important;font-size:16px!important;top:10px!important;right:12px!important;}

  /* Popup inner */
  .popup{padding:16px 16px 14px;}
  .popup-nom{font-size:15px;font-weight:700;color:#F0F4FF;margin-bottom:4px;letter-spacing:-.1px;}
  .popup-loc{font-size:12px;color:rgba(240,244,255,0.5);margin-bottom:10px;}
  .popup-pills{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;}
  .pill{padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;}
  .pill-blue{background:rgba(0,212,255,0.15);color:#00D4FF;border:1px solid rgba(0,212,255,0.3);}
  .pill-green{background:rgba(0,229,160,0.15);color:#00E5A0;border:1px solid rgba(0,229,160,0.3);}
  .popup-btn{
    width:100%;padding:10px;background:#00D4FF;border:none;border-radius:10px;
    color:#080C14;font-size:13px;font-weight:700;cursor:pointer;letter-spacing:.3px;
  }
  .popup-btn:active{opacity:.85;}

  /* Marker custom */
  .mk{
    width:32px;height:32px;border-radius:50%;
    border:2.5px solid rgba(255,255,255,0.85);
    box-shadow:0 0 0 4px rgba(0,212,255,0.25),0 4px 12px rgba(0,0,0,0.5);
    transition:transform .15s ease;
    cursor:pointer;
  }
  .mk-default{background:radial-gradient(circle at 35% 35%,#1ee8ff,#0098c8);}
  .mk-selected{
    background:radial-gradient(circle at 35% 35%,#ff7a82,#e0333f);
    box-shadow:0 0 0 6px rgba(255,92,106,0.35),0 4px 16px rgba(0,0,0,0.6);
    transform:scale(1.18);
  }
  .mk-inner{
    width:10px;height:10px;border-radius:50%;
    background:rgba(255,255,255,0.9);
    position:absolute;top:50%;left:50%;
    transform:translate(-50%,-50%);
  }
</style>
</head>
<body>
<div id="map"></div>
<script>
  const map = L.map('map',{zoomControl:false,attributionControl:false}).setView([${clat},${clng}],9);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(map);

  const spots = ${JSON.stringify(markers)};
  const objs  = {};

  function mkIcon(selected){
    return L.divIcon({
      className:'',
      html:'<div class="mk '+(selected?'mk-selected':'mk-default')+'"><div class="mk-inner"></div></div>',
      iconSize:[32,32],iconAnchor:[16,16],popupAnchor:[0,-18],
    });
  }

  spots.forEach(s=>{
    const m=L.marker([s.lat,s.lng],{icon:mkIcon(false)}).addTo(map);
    const popupHtml=\`<div class="popup">
      <div class="popup-nom">\${s.nom}</div>
      <div class="popup-loc">\${s.localite}</div>
      <div class="popup-pills">
        <span class="pill pill-blue">⬇ \${s.profondeur}</span>
        <span class="pill pill-green">👁 \${s.visibilite}m</span>
      </div>
      <button class="popup-btn" onclick="window.ReactNativeWebView.postMessage(String(\${s.id}))">
        Voir les détails →
      </button>
    </div>\`;
    m.bindPopup(popupHtml,{minWidth:220,maxWidth:260,className:'clean-popup'});
    objs[s.id]=m;
  });

  // Messages depuis RN
  document.addEventListener('message',handle);
  window.addEventListener('message',handle);
  function handle(e){
    try{
      const d=JSON.parse(e.data);
      if(d.type==='centerOnMarker'&&d.spotId){
        const m=objs[d.spotId];
        if(m){
          // Reset tous les markers
          Object.values(objs).forEach(x=>x.setIcon(mkIcon(false)));
          m.setIcon(mkIcon(true));
          map.setView(m.getLatLng(),13,{animate:true});
          setTimeout(()=>m.openPopup(),400);
        }
      } else if(d.type==='centerOnLocation'&&d.lat&&d.lng){
        map.setView([d.lat,d.lng],11,{animate:true});
        L.circleMarker([d.lat,d.lng],{
          radius:9,color:'#FF5C6A',fillColor:'#FF5C6A',
          fillOpacity:0.9,weight:3,
        }).addTo(map);
      }
    }catch(err){}
  }
</script>
</body>
</html>`;
  }, [spots, region]);

  useEffect(() => {
    if (markerSelected && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ type: 'centerOnMarker', spotId: markerSelected.id }));
    }
  }, [markerSelected]);

  useEffect(() => {
    if (location && webViewRef.current) {
      const lat = location.coords?.latitude ?? location.latitude;
      const lng = location.coords?.longitude ?? location.longitude;
      if (lat && lng) {
        webViewRef.current.postMessage(JSON.stringify({ type: 'centerOnLocation', lat, lng }));
      }
    }
  }, [location]);

  const handleMessage = useCallback((e) => {
    const spotId = parseInt(e.nativeEvent.data, 10);
    const spot = spots.find(s => s.id === spotId);
    if (spot && onSpotPress) onSpotPress(spot);
  }, [spots, onSpotPress]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: html() }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
      />
    </View>
  );
};

DivingMapSimple.propTypes = {
  spots: PropTypes.array,
  markerSelected: PropTypes.object,
  onSpotPress: PropTypes.func,
  region: PropTypes.object,
  location: PropTypes.object,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080C14' },
  webview:   { flex: 1, backgroundColor: '#080C14' },
});

export default DivingMapSimple;

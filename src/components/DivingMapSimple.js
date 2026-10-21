/** Carte principale : fond satellite, spots filtrés et aperçu du spot sélectionné. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const DivingMapSimple = ({ spots = [], currentMarkers, markerSelected, onSpotPress, region, location }) => {
  const { colors } = useTheme();
  const webViewRef = useRef(null);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [satellite, setSatellite] = useState(true);
  const visibleSpots = currentMarkers ?? spots;

  const markers = useMemo(() => visibleSpots
    .filter(s => Number.isFinite(s?.latitude) && Number.isFinite(s?.longitude))
    .map(s => ({
      id: s.id, lat: s.latitude, lng: s.longitude,
      nom: escapeHtml(s.nom), localite: escapeHtml(s.localite),
      profondeur: `${s.profondeur_min ?? 0}–${s.profondeur_max ?? 0} m`,
      visibilite: escapeHtml(s.visibilite),
    })), [visibleSpots]);

  const html = useMemo(() => {
    const clat = region?.latitude || 43.2965;
    const clng = region?.longitude || 5.3698;
    const safeMarkers = JSON.stringify(markers).replace(/</g, '\\u003c');
    return `<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{box-sizing:border-box}html,body,#map{width:100%;height:100%;margin:0;background:#03111f}
.leaflet-container{background:#03111f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.satellite-tiles img{filter:brightness(.79) saturate(1.25)}
.street-tiles img{filter:invert(1) hue-rotate(200deg) brightness(.84) saturate(.85)}
.leaflet-control-attribution{background:rgba(3,17,31,.72)!important;color:#b4c8df!important;font-size:9px!important}
.leaflet-control-attribution a{color:#00ddf5!important}
.leaflet-popup-content-wrapper{background:rgba(3,17,31,.96);border:1px solid rgba(0,221,245,.54);border-radius:20px;color:#f4f8ff;box-shadow:0 14px 34px rgba(0,0,0,.58);padding:0;overflow:hidden}
.leaflet-popup-tip{background:#03111f}.leaflet-popup-close-button{color:#a9c0d9!important;font-size:20px!important;top:7px!important;right:10px!important}
.leaflet-popup-content{margin:0!important}.popup{padding:17px;width:232px}.popup-title{font-size:17px;font-weight:800;line-height:1.2;padding-right:18px}.popup-loc{font-size:12px;color:#a9c0d9;margin:5px 0 14px}.popup-metrics{display:flex;gap:7px;margin-bottom:14px}.metric{padding:5px 9px;border-radius:100px;background:rgba(0,221,245,.12);border:1px solid rgba(0,221,245,.38);font-size:11px;font-weight:700;color:#00ddf5}.metric.green{color:#00e5a0;border-color:rgba(0,229,160,.4);background:rgba(0,229,160,.1)}.popup-btn{width:100%;border:0;border-radius:12px;background:linear-gradient(100deg,#00ddf5,#008fff);color:#03111f;font-size:14px;font-weight:800;padding:12px;cursor:pointer}
.spot-pin{width:35px;height:35px;border-radius:50%;border:3px solid #f4f8ff;background:#00bbef;box-shadow:0 0 0 5px rgba(0,221,245,.25),0 5px 18px #001b2f;display:flex;align-items:center;justify-content:center}.spot-pin:after{content:'';width:9px;height:9px;border-radius:50%;background:white}.spot-pin.selected{background:#ff4757;box-shadow:0 0 0 6px rgba(255,71,87,.3),0 5px 18px #001b2f}
.user-pin{width:22px;height:22px;border:3px solid white;border-radius:50%;background:#008fff;box-shadow:0 0 0 8px rgba(0,143,255,.25)}
</style></head><body><div id="map"></div><script>
const map=L.map('map',{zoomControl:false,attributionControl:true}).setView([${clat},${clng}],9);
const streets=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,className:'street-tiles',attribution:'&copy; OpenStreetMap contributors'});
const imagery=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:18,className:'satellite-tiles',attribution:'Tiles &copy; Esri, Maxar, Earthstar Geographics'});
let satellite=true,imageryErrors=0,userMarker=null;
imagery.on('tileerror',()=>{if(++imageryErrors>4&&satellite){map.removeLayer(imagery);streets.addTo(map);satellite=false;send('baseChanged',false)}});
imagery.addTo(map);
const spots=${safeMarkers},objs={};
function icon(selected){return L.divIcon({className:'',html:'<div class="spot-pin '+(selected?'selected':'')+'"></div>',iconSize:[35,35],iconAnchor:[17,17],popupAnchor:[0,-20]})}
function send(type,id){window.ReactNativeWebView.postMessage(JSON.stringify({type,id}))}
window.openSpot=function(id){send('open',id)};
spots.forEach(s=>{const marker=L.marker([s.lat,s.lng],{icon:icon(false)}).addTo(map);
marker.on('click',()=>{Object.values(objs).forEach(m=>m.setIcon(icon(false)));marker.setIcon(icon(true));send('select',s.id)});
marker.bindPopup('<div class="popup"><div class="popup-title">'+s.nom+'</div><div class="popup-loc">'+s.localite+'</div><div class="popup-metrics"><span class="metric">Prof. '+s.profondeur+'</span><span class="metric green">Visib. '+s.visibilite+' m</span></div><button class="popup-btn" onclick="window.openSpot('+JSON.stringify(s.id)+')">Voir le spot</button></div>',{minWidth:232,maxWidth:232});objs[s.id]=marker});
function handle(event){try{const d=JSON.parse(event.data);
if(d.type==='centerOnMarker'){const marker=objs[d.spotId];if(marker){Object.values(objs).forEach(m=>m.setIcon(icon(false)));marker.setIcon(icon(true));map.setView(marker.getLatLng(),13,{animate:true});setTimeout(()=>marker.openPopup(),350)}}
if(d.type==='centerOnLocation'&&Number.isFinite(d.lat)&&Number.isFinite(d.lng)){map.setView([d.lat,d.lng],12,{animate:true});if(userMarker)map.removeLayer(userMarker);userMarker=L.marker([d.lat,d.lng],{icon:L.divIcon({className:'',html:'<div class="user-pin"></div>',iconSize:[22,22],iconAnchor:[11,11]})}).addTo(map)}
if(d.type==='toggleBase'){if(satellite){map.removeLayer(imagery);streets.addTo(map)}else{map.removeLayer(streets);imageryErrors=0;imagery.addTo(map)}satellite=!satellite;send('baseChanged',satellite)}
}catch(error){}}
document.addEventListener('message',handle);window.addEventListener('message',handle);
</script></body></html>`;
  }, [markers, region?.latitude, region?.longitude]);

  const source = useMemo(() => ({ html }), [html]);
  const send = useCallback((message) => webViewRef.current?.postMessage(JSON.stringify(message)), []);

  useEffect(() => {
    if (markerSelected) send({ type: 'centerOnMarker', spotId: markerSelected.id });
  }, [markerSelected, send]);

  const centerOnLocation = useCallback(() => {
    const lat = location?.coords?.latitude ?? location?.latitude;
    const lng = location?.coords?.longitude ?? location?.longitude;
    if (Number.isFinite(lat) && Number.isFinite(lng)) send({ type: 'centerOnLocation', lat, lng });
  }, [location, send]);

  useEffect(() => { centerOnLocation(); }, [centerOnLocation]);

  const handleMessage = useCallback((event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'baseChanged') { setSatellite(Boolean(message.id)); return; }
      const spot = visibleSpots.find(s => String(s.id) === String(message.id));
      if (!spot) return;
      if (message.type === 'select') setSelectedSpot(spot);
      if (message.type === 'open') onSpotPress?.(spot);
    } catch { /* Ignore unrelated WebView messages. */ }
  }, [visibleSpots, onSpotPress]);

  useEffect(() => {
    if (selectedSpot && !visibleSpots.some(s => s.id === selectedSpot.id)) setSelectedSpot(null);
  }, [visibleSpots, selectedSpot]);

  return <View style={styles.container}>
    <WebView ref={webViewRef} source={source} style={styles.webview} onMessage={handleMessage}
      onLoadEnd={centerOnLocation} javaScriptEnabled domStorageEnabled scrollEnabled={false}
      bounces={false} overScrollMode="never" originWhitelist={['*']} />

    <View style={styles.mapControls}>
      <TouchableOpacity style={styles.control} onPress={() => send({ type: 'toggleBase' })} accessibilityLabel={satellite ? 'Afficher le plan' : 'Afficher la vue satellite'}>
        <Ionicons name="layers-outline" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.control} onPress={centerOnLocation} accessibilityLabel="Centrer sur ma position">
        <Ionicons name="locate-outline" size={25} color={colors.primary} />
      </TouchableOpacity>
    </View>

    {selectedSpot && <View style={[styles.preview, { borderColor: colors.borderMid, backgroundColor: colors.bgGlass }]}>
      <View style={styles.handle} />
      <TouchableOpacity style={styles.previewClose} onPress={() => setSelectedSpot(null)} accessibilityLabel="Fermer l’aperçu">
        <Ionicons name="close-outline" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.previewBody} onPress={() => onSpotPress?.(selectedSpot)} activeOpacity={0.8}>
        <Image source={{ uri: selectedSpot.photos_fond_marin?.[0] || selectedSpot.photo }} style={styles.previewImage} />
        <View style={styles.previewText}>
          <Text style={[styles.previewTitle, { color: colors.textPrimary }]} numberOfLines={2}>{selectedSpot.nom}</Text>
          <Text style={[styles.previewLocation, { color: colors.textSecondary }]} numberOfLines={1}>{selectedSpot.localite}</Text>
          <View style={styles.previewMetrics}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ionicons name="water-outline" size={15} color={colors.primary} /><Text style={[styles.previewMetric, { color: colors.primary }]}>{selectedSpot.profondeur_min}–{selectedSpot.profondeur_max} m</Text></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ionicons name="eye-outline" size={15} color={colors.emerald} /><Text style={[styles.previewMetric, { color: colors.emerald }]}>{selectedSpot.visibilite} m</Text></View>
          </View>
        </View>
        <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>}
  </View>;
};

DivingMapSimple.propTypes = {
  spots: PropTypes.array,
  currentMarkers: PropTypes.array,
  markerSelected: PropTypes.object,
  onSpotPress: PropTypes.func,
  region: PropTypes.object,
  location: PropTypes.object,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#03111F' },
  webview: { flex: 1, backgroundColor: '#03111F' },
  mapControls: { position: 'absolute', top: 82, right: 14, gap: 10 },
  control: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(3,17,31,.94)', borderWidth: 1, borderColor: 'rgba(70,179,230,.6)', alignItems: 'center', justifyContent: 'center' },
  preview: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, borderWidth: 1, borderBottomWidth: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, shadowColor: '#000', shadowOpacity: .45, shadowRadius: 20, elevation: 15 },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#7593B3', alignSelf: 'center', marginBottom: 14 },
  previewClose: { position: 'absolute', right: 12, top: 11, padding: 8, zIndex: 1 },
  previewBody: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 20 },
  previewImage: { width: 90, height: 90, borderRadius: 14, backgroundColor: '#0B243A' },
  previewText: { flex: 1, gap: 5 },
  previewTitle: { fontSize: 18, fontWeight: '800', lineHeight: 22 },
  previewLocation: { fontSize: 13 },
  previewMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  previewMetric: { fontSize: 12, fontWeight: '700' },
});

export default DivingMapSimple;

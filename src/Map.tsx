import { FC } from "react";
import { useTheme, styled } from '@mui/material/styles';

import { LatLngExpression, icon as LeafletIcon } from "leaflet";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import markerIconUrl from "leaflet/dist/images/marker-icon.png?url";
import markerIconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png?url";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png?url";

interface MapProps {
    mark: LatLngExpression;
    height?: CSSStyleDeclaration["height"];
    width?: CSSStyleDeclaration["width"];
}

const DarkMapContainer = styled(MapContainer)({
    '& .leaflet-tile': {
        filter: "invert(1) hue-rotate(180deg) saturate(0.8) contrast(0.9) brightness(1.5)"
    }
});

const makerIcon = LeafletIcon({
    iconUrl: markerIconUrl,
    iconRetinaUrl: markerIconRetinaUrl,
    shadowUrl: markerShadowUrl,

    iconSize:      [25,  41], // size of the icon
    iconAnchor:    [12,  41], // point of the icon which will correspond to marker's location
    popupAnchor:   [ 1, -34], // point from which the popup should open relative to the iconAnchor
    tooltipAnchor: [16, -28],
    shadowSize:    [41,  41], // size of the shadow
    shadowAnchor:  [12,  41], // the same for the shadow
});

const Map: FC<MapProps> = ({ mark, height, width }) => {
    const theme = useTheme();
    const isDark = (theme.palette.mode === 'dark');

    const StyledMapContainer = (isDark ? DarkMapContainer: MapContainer);
    return (
        <StyledMapContainer style={{ height: height || "100%", width: width || "100%"}} center={mark} zoom={9} scrollWheelZoom={true}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://retina-tiles.p.rapidapi.com/local/osm@2x/v1/{z}/{x}/{y}.png?rapidapi-key=036e2f2406mshc837ebb7019e97cp166125jsn8182b9dea823"/>
            <Marker
                position={mark}
                icon={makerIcon}
            />
        </StyledMapContainer>);
}

export default Map;

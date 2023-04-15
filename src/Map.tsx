import { FC } from "react";
import { useTheme, styled } from '@mui/material/styles';

import { LatLngExpression } from "leaflet";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

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

const Map: FC<MapProps> = ({ mark, height, width }) => {
    const theme = useTheme();
    const isDark = (theme.palette.mode === 'dark');

    const StyledMapContainer = (isDark ? DarkMapContainer: MapContainer);
    
    return (
        <StyledMapContainer style={{ height: height || "100%", width: width || "100%"}} center={mark} zoom={9} scrollWheelZoom={true}>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}@2x.png" /* ?lang=en */ />
            <Marker position={mark} />
        </StyledMapContainer>);
}

export default Map;

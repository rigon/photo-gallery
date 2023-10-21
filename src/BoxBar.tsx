import { FC, CSSProperties } from "react";
import Box, { BoxProps } from "@mui/material/Box";

interface BoxBarProps extends Omit<BoxProps, "top" | "right" | "bottom" | "left"> {
    /** Align vertically to the top */
    top?: boolean;
    /** Align vertically to the middle */
    middle?: boolean;
    /** Align vertically to the bottom */
    bottom?: boolean;
    /** Align horizontally to the left */
    left?: boolean;
    /** Align horizontally to the center */
    center?: boolean;
    /** Align horizontally to the right */
    right?: boolean;
}

const BoxBar: FC<BoxBarProps> = ({top, middle, bottom, left, center, right, sx, children, ...remaining}) => {
    let inset: CSSProperties["inset"];
    let transform: CSSProperties["transform"];
    let textAlign: CSSProperties["textAlign"];
    
    // Vertical align
    if(top === true)
        inset = "0 0 auto 0";
    else if(middle === true) {
        inset = "50% auto auto 50%";
        transform = "translate(-50%, -50%)";
    }
    else if(bottom === true)
        inset = "auto 0 0 0";

    // Horizontal align
    if(left === true)
        textAlign = "left";
    else if(center === true)
        textAlign = "center";
    else if(right === true)
        textAlign = "right";

    return (
        <Box sx={{
            position: "absolute",
            overflow: "hidden",
            padding: 1,
            inset,
            transform,
            textAlign,
            ...sx
        }} {...remaining}>
            {children}
        </Box>
    );
}

export default BoxBar;

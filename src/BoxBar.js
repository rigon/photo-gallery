import React from "react";
import PropTypes from "prop-types";

import Box from "@mui/material/Box";

function BoxBar(props) {

    let inset, transform, textAlign;
    // Vertical align
    if(props.top === true)
        inset = "0 0 auto 0";
    else if(props.middle === true) {
        inset = "50% auto auto 50%";
        transform = "translate(-50%, -50%)";
    }
    else if(props.bottom === true)
        inset = "auto 0 0 0";

    // Horizontal align
    if(props.left === true)
        textAlign = "left";
    else if(props.center === true)
        textAlign = "center";
    else if(props.right === true)
        textAlign = "right";

    return (
        <Box sx={{
            position: "absolute",
            overflow: "hidden",
            padding: 1,
            inset,
            transform,
            textAlign,
            ...props.sx,
            color: "white",
        }}>
            {props.children}
        </Box>
    );
}

BoxBar.propTypes = {
    /** Align vertically to the top */
    top: PropTypes.bool,
    /** Align vertically to the middle */
    middle: PropTypes.bool,
    /** Align vertically to the bottom */
    bottom: PropTypes.bool,
    /** Align horizontally to the left */
    left: PropTypes.bool,
    /** Align horizontally to the center */
    center: PropTypes.bool,
    /** Align horizontally to the right */
    right: PropTypes.bool,
}

export default BoxBar;

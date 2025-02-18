import * as React from "react";

import {
    IconButton,
    label,
    useLightboxProps,
    useLightboxState,
} from "yet-another-react-lightbox/core";

import {
    IconInfoCircleFilled,
} from "@tabler/icons-react";

export const InfoButton: React.FC = () => {
    const {
        currentIndex,
    } = useLightboxState();

    const {
        info: props,
        labels,
    } = useLightboxProps();

    const onClick = props?.onClick;

    const showInfo = React.useCallback(() => {
        if (typeof (onClick) === "function")
            onClick(currentIndex);
    }, [currentIndex, onClick]);

    return (
        <IconButton
            label={label(labels, "Show photo details")}
            icon={IconInfoCircleFilled}
            onClick={showInfo}
        />
    );
};

import React, { useContext, useEffect, useState } from "react";

interface ContextProps {
    onEvent: (name: string, index: number) => () => void;
    register: (index: number, setSelected: React.Dispatch<React.SetStateAction<boolean>>) => void;
}

interface SelectionContextProps {
    children?: React.ReactNode;
}

interface SelectableProps {
    index: number;
    children?: React.ReactNode;
    onChange?: (selected: boolean, index: number) => void;
}

const SelectContext = React.createContext<ContextProps>({
    onEvent: () => () => {},
    register: () => {},
});

export function SelectionContext({ children }: SelectionContextProps) {
    const cbs: React.Dispatch<React.SetStateAction<boolean>>[] = [];
    const start = () => {};
    const select = () => {};
    const stopSelection = () => {};
    
    const onEvent = (name:string, index:number) => () => {
        console.log("Event:", name, index);

        switch(name) {
            case "onClick": cbs[index](e => !e); break;
            // case "onClick": openLightbox(); break;
            // case "onDoubleClick": saveFavorite(); break;
            // case "onMouseEnter": mouseEnter(); break;
            // case "onMouseLeave": mouseLeave(); break;
            case "onMouseDown": start(); break;
            case "onMouseMove": select(); break;
            case "onMouseUp": ; stopSelection(); break;
            case "onTouchStartCapture": start(); break;
            case "onTouchMove": select(); break;
            case "onTouchEnd": stopSelection(); break;
        }
    }

    const register: ContextProps["register"] = (index, setSelected) => {
        cbs[index] = setSelected;
    }

    return (
        <SelectContext.Provider value={{onEvent, register}}>
            {children}
        </SelectContext.Provider>
    );
}

export function Selectable({ index, children, onChange }: SelectableProps) {
    const ctx = useContext(SelectContext);
    const [selected, setSelected] = useState(false);
    const logEvent = ctx.onEvent;
    ctx.register(index, setSelected);

    // Trigger onChange event when selected
    useEffect(() => {
        if(onChange)
            onChange(selected, index);
    }, [onChange, selected] );

    console.log(index, selected);

    return (
        <div
            style={{ display: "contents" }}
            // MouseEvents
            onAuxClick={logEvent("onAuxClick", index)}
            onClick={logEvent("onClick", index)}
            onContextMenu={logEvent("onContextMenu", index)}
            onDoubleClick={logEvent("onDoubleClick", index)}
            onDrag={logEvent("onDrag", index)}
            onDragEnd={logEvent("onDragEnd", index)}
            onDragEnter={logEvent("onDragEnter", index)}
            onDragExit={logEvent("onDragExit", index)}
            onDragLeave={logEvent("onDragLeave", index)}
            onDragOver={logEvent("onDragOver", index)}
            onDragStart={logEvent("onDragStart", index)}
            onDrop={logEvent("onDrop", index)}
            onMouseDown={logEvent("onMouseDown", index)}
            onMouseEnter={logEvent("onMouseEnter", index)}
            onMouseLeave={logEvent("onMouseLeave", index)}
            onMouseMove={logEvent("onMouseMove", index)}
            onMouseOut={logEvent("onMouseOut", index)}
            onMouseOver={logEvent("onMouseOver", index)}
            onMouseUp={logEvent("onMouseUp", index)}
            // Touch Events
            onTouchCancel={logEvent("onTouchCancel", index)}
            onTouchEnd={logEvent("onTouchEnd", index)}
            onTouchMove={logEvent("onTouchMove", index)}
            onTouchStart={logEvent("onTouchStart", index)}
            >
            {children}
        </ div>
    );
}

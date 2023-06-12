import React, { useContext, useEffect, useState } from "react";
import "./selection.scss";

type MapKeyType = string | number | symbol;

interface ContextProps {
    name?: string;
    onEvent: (name: string, index: number) => () => void;
    register: (item: any, setSelected: React.Dispatch<React.SetStateAction<boolean>>) => number;
}

interface SelectionContextProps<ItemType> {
    name?: string;
    children?: React.ReactNode;
    transformItemToId?: (item: ItemType) => MapKeyType;
}

interface SelectableProps<ItemType> {
    item: ItemType;
    children?: React.ReactNode;
    onChange?: (selected: boolean, index: number) => void;
}

// Create the selection context
const SelectContext = React.createContext<ContextProps>({
    onEvent: () => () => {},
    register: () => 0,
});

interface Ctx {
    // Counter for added items
    count: number;
    // List of items, used in the result of selection
    items: any[];
    // Map between items and indexes
    keyMap: {[key: MapKeyType]: number};
    // Callbacks of registered children
    cbs: React.Dispatch<React.SetStateAction<boolean>>[];
    // Current selected items
    selection: boolean[];
}

// List of contexts
const ctxs: {[key: string]: Ctx} = {};

function getName(name?: string) {
    return name === undefined ? "__default__" : name;
}

export function useSelectionContext(contextName?: string) {
    const cancel = () => {
        const ctx = ctxs[getName(contextName)];
        // For each item selected, call the callback deselected
        ctx.cbs.forEach((cb, i) => {
            if(ctx.selection[i])
                cb(false);
        });
        // Clear selection
        ctx.selection.fill(false);
    };
    const get = () => {
        const ctx = ctxs[getName(contextName)];
        
        let selected: any[] = [];
        for(let i=0; i<ctx.selection.length; i++)
            if(ctx.selection[i])
                selected.push(ctx.items[i]);
        
        return selected;
    };
    
    return {
        get,
        cancel,
        isSelecting: true,
    }
}


// Context and Consumers

export function SelectionContext<ItemType>({ name, children, transformItemToId }: SelectionContextProps<ItemType>) {
    // Selection
    let selecting = false;
    let startIndex = 0;
    let prevIndex = 0;
    let value = false;
    let firstsMoves = 0;

    useEffect(() => {
        // On ComponentMount
        // Create context if doesn't exist
        if(ctxs[getName(name)] === undefined) {
            ctxs[getName()] = {
                count: 0,
                items: [],
                keyMap: {},
                cbs: [],
                selection: [],
            };
        }
        
        // On ComponentWillUnmount
        return () => {
            delete ctxs[getName()];
        }
    });

    const start = (index: number) => {
        const ctx = ctxs[getName(name)];
        value = !ctx.selection[index];
        selecting = true;
        startIndex = index;
        prevIndex = index;
        firstsMoves = 0;
    };
    const select = (index: number) => {
        // Not selecting
        if(!selecting)
            return;
        
        // Number of moves that must occur befere start selecting
        if(firstsMoves < 3) {
            firstsMoves++;
            return;
        }

        // No changes in selection
        if(prevIndex === index) {
            const ctx = ctxs[getName(name)];
            // Special case for startIndex, select it if not selected
            if(index === startIndex && ctx.selection[index] !== value) {
                ctx.selection[index] = value;
                if(ctx.cbs[index])
                    ctx.cbs[index](value);
            }
            return;
        }

        // Side of startIndex, right (true) or left (false)
        const side = (index >= startIndex);
        // Indicates if selection is increasing (true) or decreasing (false)
        const dir = (!side && prevIndex > index) ||
                    ( side && prevIndex < index);
        // Indicates if selection delta crosses the starting point
        const cross = (!side && prevIndex >= startIndex) ||
                      ( side && prevIndex <= startIndex);
        // Interval of items that are changing
        const offsetmin =  side && !cross ? 1 : 0;
        const offsetmax = !side && !cross ? 1 : 0;
        const min = Math.min(prevIndex, index) + offsetmin;
        const max = Math.max(prevIndex, index) - offsetmax;
        // Iterate over changing items
        const ctx = ctxs[getName()];
        for(let i = min; i <= max ; i++) {
            const hasCrossed = (!side && i > startIndex) ||
                               ( side && i < startIndex);
            const newVal = (hasCrossed ? !dir : dir) === value;
            // Trigger event on the component
            if(ctx.selection[i] !== newVal && ctx.cbs[i])
                ctx.cbs[i](newVal);
            // Select or deselect
            ctx.selection[i] = newVal;
        }
        prevIndex = index;
    };
    const stop = () => {
        selecting = false;
    };
    
    const onEvent = (name:string, index:number) => () => {
        switch(name) {
            // case "onClick": openLightbox(); break;
            // case "onDoubleClick": saveFavorite(); break;
            // case "onMouseEnter": mouseEnter(); break;
            // case "onMouseLeave": mouseLeave(); break;
            case "onMouseDown": start(index); break;
            case "onMouseMove": select(index); break;
            case "onMouseUp": ; stop(); break;
            case "onTouchStartCapture": start(index); break;
            case "onTouchMove": select(index); break;
            case "onTouchEnd": stop(); break;
        }
    }

    const register: ContextProps["register"] = (item: ItemType, setSelected) => {
        const ctx = ctxs[getName(name)];
        const key = transformItemToId ? transformItemToId(item) : item as MapKeyType;
        if(ctx.keyMap[key] === undefined) {
            ctx.keyMap[key] = ctx.count;
            ctx.count++;
        }

        const index = ctx.keyMap[key];
        ctx.items[index] = item;
        ctx.cbs[index] = setSelected;
        return index;
    }

    return (
        <SelectContext.Provider value={{name, onEvent, register}}>
            <div className="selection__not-draggable">
                {children}
            </div>
        </SelectContext.Provider>
    );
}

export function Selectable<ItemType>({ item, children, onChange }: SelectableProps<ItemType>) {
    const ctx = useContext(SelectContext);
    const [selected, setSelected] = useState(false);
    const [index] = useState(() => ctx.register(item, setSelected));

    const logEvent = ctx.onEvent;
    // Trigger onChange event when selected
    useEffect(() => {
        if(onChange)
            onChange(selected, index);
    }, [onChange, selected, index] );

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

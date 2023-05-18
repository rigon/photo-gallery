import React, { useContext, useEffect, useState } from "react";
import "./selection.scss";

type MapKeyType = string | number | symbol;

interface ContextProps {
    onEvent: (name: string, index: number) => () => void;
    register: (item: any, setSelected: React.Dispatch<React.SetStateAction<boolean>>) => number;
    cancel: () => void;
    get: () => any[];
}

interface SelectionContextProps<ItemType> {
    name?: string;
    children?: React.ReactNode;
    onSelection?: (selected: ItemType[]) => void;
    transformItemToId?: (item: ItemType) => MapKeyType;
}

interface SelectableProps {
    item: any;
    children?: React.ReactNode;
    onChange?: (selected: boolean, index: number) => void;
}

// Create the selection context
const SelectContext = React.createContext<ContextProps>({
    onEvent: () => () => {},
    register: () => 0,
    cancel: () => {},
    get: () => [],
});

// List of contexts created
const ctxs: {[key: string]: ContextProps} = {};

// Hooks

function getName(name?: string) {
    return name === undefined ? "__default__" : name;
}
// Registers the reference to the context to be used by hooks
// (internal use only)
function Hooks({name}: {name?: string}) {
    ctxs[getName(name)] = useContext(SelectContext);
    return null;
}

export function useSelectionContext(contextName?: string) {
    return {
        isSelecting: true,
        cancel: () => ctxs[getName(contextName)].cancel(),
        get: () => ctxs[getName(contextName)].get(),
    }
}

// Context and Consumers

export function SelectionContext<ItemType>({ name, children, onSelection, transformItemToId }: SelectionContextProps<ItemType>) {
    // Counter for added items
    let count = 0;
    // List of items, used in the result of selection
    const items: ItemType[] = [];
    // Map between items and indexes
    const keyMap: {[key: MapKeyType]: number} = {};
    // Callbacks of registered children
    const cbs: React.Dispatch<React.SetStateAction<boolean>>[] = [];

    let selecting = false;
    let startIndex = 0;
    let prevIndex = 0;
    let value = false;
    let firstsMoves = 0;
    let selection: boolean[] = [];

    const start = (index: number) => {
        value = !selection[index];
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
        if(prevIndex === index)
            return;

        // Indicates if selection is increasing or decreasing
        const cond = (index < startIndex && prevIndex > index) ||
                     (index >= startIndex && prevIndex < index);
        console.log(cond ? "INCREASING" : "DECREASING");
        // Indicates if selection delta crosses the starting point
        const mid = (index <= startIndex && prevIndex >= startIndex) ||
                    (index >=  startIndex && prevIndex <= startIndex);
        mid && console.log("CROSSED");
        const offs = cond ? 0 : 1;
        // Interval of items that are changing
        const min = Math.min(prevIndex, index) + (cond ? 0 : 0);
        const max = Math.max(prevIndex, index) + (cond ? 0 : 0);
        console.log("Min:", min, "Max:", max);
        for(let i = min + offs; i <= max ; i++) {
            const midVal = mid ? index < startIndex ? i <= startIndex : i >= startIndex : value;
            const newVal = cond ? midVal : !midVal;
            // Trigger event on the component
            if(selection[i] !== newVal && cbs[i])
                cbs[i](newVal);
            // Select or deselect
            selection[i] = newVal;
        }
        prevIndex = index;
    };
    const stop = () => {
        selecting = false;
        // Trigger event with selected elements
        if(onSelection)
            onSelection(get());
    };
    const cancel = () => {
        // For each item selected, call the callback deselected
        cbs.forEach((cb, i) => {
            if(selection[i])
                cb(false);
        });
        // Clear selection
        selection.fill(false);
    };
    const get = () => {
        let selected: ItemType[] = [];
        for(let i=0; i<selection.length; i++)
            if(selection[i])
                selected.push(items[i]);
        
        return selected;
    };
    
    const onEvent = (name:string, index:number) => () => {
        //console.log("Event:", name, index);

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
        const key = transformItemToId ? transformItemToId(item) : item as MapKeyType;
        
        if(!keyMap[key]) {
            keyMap[key] = count;
            count++;
        }

        const index = keyMap[key];
        items[index] = item;
        cbs[index] = setSelected;
        return index;
    }

    return (
        <SelectContext.Provider value={{onEvent, register, cancel, get}}>
            <Hooks name={name} />
            <div className="not-draggable">
                {children}
            </div>
        </SelectContext.Provider>
    );
}

export function Selectable({ item, children, onChange }: SelectableProps) {
    const ctx = useContext(SelectContext);
    const [selected, setSelected] = useState(false);
    const index = ctx.register(item, setSelected);
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

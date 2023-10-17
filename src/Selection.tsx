import React, { useContext, useEffect, useRef, useState } from "react";
import "./selection.scss";

interface SelectionContextProps<T> {
    // Register selectable items with the provider
    register: (item: T, setSelected: React.Dispatch<React.SetStateAction<boolean>>) => number;
    // Trigger events on the selected items
    onEvent: (name: string, index: number) => () => void;
    // Selected indexes
    indexes: () => number[];
    // Selected items
    get: () => T[];
    // Select all items
    all: () => void;
    // Cancel current selection
    cancel: () => void;
    // Is currently selecting
    isSelecting: boolean;
}

const SelectionContext = React.createContext<SelectionContextProps<any>>({
    register: () => -1,
    onEvent: () => () => undefined,
    indexes: () => [],
    get: () => [],
    all: () => undefined,
    cancel: () => undefined,
    isSelecting: false,
});

interface SelectionProviderProps<T> {
    children?: React.ReactNode;
    itemToId?(item: T): string;
    onChange?(selection: T[]): void;
    onIsSelecting?(isSelecting: boolean): void;
}

interface SelectionData<T> {
    // List of items, used in the result of selection
    items: {
        // Actual item
        v: T;
        // Callback of registered item
        cb: React.Dispatch<React.SetStateAction<boolean>>;
        // Current selection state
        selected: boolean;
    }[],
    // Map between items and indexes
    keyIndexes: {[key: string]: number},
    // Counter of added items
    nItems: number;
    // Counter of selected items
    count: number;
    // Selection
    selecting: boolean;
    startIndex: number;
    prevIndex: number;
    value: boolean;
    firstsMoves: number;
}

function SelectionProvider<T>({ children, itemToId, onChange, onIsSelecting }: SelectionProviderProps<T>) {
    const [isSelecting, setSelecing] = useState<boolean>(false);

    const itemToIdFn = itemToId ? itemToId : (item: T) => String(item);

    const d = useRef<SelectionData<T>>({
        items: [],
        keyIndexes: {},
        nItems: 0,
        count: 0,
        selecting: false,
        startIndex: 0,
        prevIndex: 0,
        value: false,
        firstsMoves: 0,
    }).current;

    const updateCount = (add: boolean) => {
        d.count += add ? 1 : -1;
        if(d.count > 0 && !isSelecting) {
            setSelecing(true);
            if(onIsSelecting)   // Trigger event onIsSelecting if is set
                onIsSelecting(true);
        }
        else if(d.count < 1 && isSelecting) {
            setSelecing(false);
            if(onIsSelecting)   // Trigger event onIsSelecting if is set
                onIsSelecting(false);
        }

        // Trigger event onChange if is set
        if(onChange)
            onChange(get());
    };

    const start = (index: number) => {
        d.value = !d.items[index].selected;
        d.selecting = true;
        d.startIndex = index;
        d.prevIndex = index;
        d.firstsMoves = 0;
    };

    const select = (index: number) => {
        const {selecting, firstsMoves, prevIndex, startIndex, value, items} = d;

        // Not selecting
        if(!selecting)
            return;
        
        // Number of moves that must occur befere start selecting
        if(firstsMoves < 3) {
            d.firstsMoves++;
            return;
        }

        // No changes in selection
        if(prevIndex === index) {
            // Special case for startIndex, select it if not selected
            if(index === startIndex && items[index].selected !== value) {
                items[index].selected = value;
                updateCount(value);
                items[index].cb(value);
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
        for(let i = min; i <= max ; i++) {
            const hasCrossed = (!side && i > startIndex) ||
                                ( side && i < startIndex);
            const newVal = (hasCrossed ? !dir : dir) === value;
            // Selection has changed
            if(items[i].selected !== newVal) {
                // Select or deselect
                items[i].selected = newVal;
                // Update counter
                updateCount(newVal);
                // Trigger event on the component
                items[i].cb(newVal);
            }
        }
        d.prevIndex = index;
    }
    const stop = () => {
        d.selecting = false;
    };
    

    const indexes = () => {
        const selected: number[] = [];
        d.items.forEach((item, index) => {
            if(item.selected)
                selected.push(index);
        });
        return selected;
    };

    const get = () => {
        return d.items.filter(({selected}) => selected).map(({v}) => v);
    };
    const all = () => {
        d.items.forEach(({selected, cb}, index) => {
            if(!selected) {
                d.items[index].selected = true;
                updateCount(true);
                cb(true);
            }
        });
    };
    const cancel = () => {
        d.items.forEach(({selected, cb}, index) => {
            if(selected) {
                d.items[index].selected = false;
                updateCount(false);
                cb(false);
            }
        });
    };

    const register = (item: T, setSelected: React.Dispatch<React.SetStateAction<boolean>>) => {
        const key = itemToIdFn(item);
        // Item not present yet, creating a new index for it
        if(d.keyIndexes[key] === undefined)
            d.keyIndexes[key] = d.nItems++;  // Set index for key, increment afterwards

        const index = d.keyIndexes[key];
        d.items[index] = { v: item, cb: setSelected, selected: false };
        return index;
    }

    const onEvent = (name: string, index: number) => () => {
        switch(name) {
            // case "onClick": openLightbox(); break;
            // case "onDoubleClick": saveFavorite(); break;
            // case "onMouseEnter": mouseEnter(); break;
            // case "onMouseLeave": mouseLeave(); break;
            case "onMouseDown": start(index); break;
            case "onMouseMove": select(index); break;
            case "onMouseUp": stop(); break;
            case "onTouchStartCapture": start(index); break;
            case "onTouchMove": select(index); break;
            case "onTouchEnd": stop(); break;
        }
    }

    return (
        <SelectionContext.Provider value={{ register, onEvent, indexes, get, all, cancel, isSelecting }}>
            <div className="selection__not-draggable">
                {children}
            </div>
        </SelectionContext.Provider>
    );
}

interface SelectableProps<T> {
    item: T;
    children?: React.ReactNode;
    onChange?: (selected: boolean, index: number) => void;
}

function Selectable<T>({ item, children, onChange }: SelectableProps<T>) {
    const ctx = useContext(SelectionContext);
    const [selected, setSelected] = useState(false);
    const [index] = useState(() => ctx.register(item, setSelected));
    const evt = ctx.onEvent;

    // Trigger onChange event when selected
    useEffect(() => {
        if(onChange)
            onChange(selected, index);
    }, [onChange, selected, index] );

    return (
        <div
            style={{ display: "contents" }}
            // MouseEvents
            onAuxClick={evt("onAuxClick", index)}
            onClick={evt("onClick", index)}
            onContextMenu={evt("onContextMenu", index)}
            onDoubleClick={evt("onDoubleClick", index)}
            onDrag={evt("onDrag", index)}
            onDragEnd={evt("onDragEnd", index)}
            onDragEnter={evt("onDragEnter", index)}
            onDragExit={evt("onDragExit", index)}
            onDragLeave={evt("onDragLeave", index)}
            onDragOver={evt("onDragOver", index)}
            onDragStart={evt("onDragStart", index)}
            onDrop={evt("onDrop", index)}
            onMouseDown={evt("onMouseDown", index)}
            onMouseEnter={evt("onMouseEnter", index)}
            onMouseLeave={evt("onMouseLeave", index)}
            onMouseMove={evt("onMouseMove", index)}
            onMouseOut={evt("onMouseOut", index)}
            onMouseOver={evt("onMouseOver", index)}
            onMouseUp={evt("onMouseUp", index)}
            // Touch Events
            onTouchCancel={evt("onTouchCancel", index)}
            onTouchEnd={evt("onTouchEnd", index)}
            onTouchMove={evt("onTouchMove", index)}
            onTouchStart={evt("onTouchStart", index)}
            >
                {children}
        </ div>
    );
}

function useSelection<T>(): SelectionContextProps<T> {
    const context = React.useContext<SelectionContextProps<T>>(SelectionContext);
    if (context === undefined) {
        throw new Error('useSelection must be used within a SelectionProvider');
    }

    return context;
}

export { SelectionProvider, Selectable, useSelection };

import { PrimitiveSingle } from "../types";

type PrimitiveRecord = Record<string, PrimitiveSingle|PrimitiveSingle[]>;

type Node<T extends PrimitiveRecord> = T & {
    children?: NodeTree<T>
};

type NodeTree<T extends PrimitiveRecord = PrimitiveRecord> = Array<T | Node<T>>

type NodeProperties = {
    short: string,
    long: string,
    info: Array<string>
};

function isLeafNode<T extends PrimitiveRecord>(node: T | Node<T>): node is T {
    if ('children' in node) {
        return false;
    } else {
        return true;
    }
}

export function *iterateLeaves<T extends PrimitiveRecord>(parentNode: Node<T>):Iterable<T> {
    if (!parentNode.children || !(parentNode.children && parentNode.children.length)) {
        if (parentNode.children) {
            delete parentNode.children;
        }
        yield parentNode;
    } else {
        for (const child of parentNode.children) {
            if (!isLeafNode(child)) {
                yield *iterateLeaves(child);
            } else {
                yield child;
            }
        }
    }
}

export function stitchStrings(s1: string, s2: string, minOverlapLength: number): string {
    let maxOverlap = Math.min(s1.length, s2.length);
  
    for (let overlap = maxOverlap; overlap >= minOverlapLength; overlap--) {
        let s1End = s1.substr(-overlap);
        let s2Start = s2.substr(0, overlap);
    
        if (s1End === s2Start) {
            return s1 + s2.slice(overlap);
        }
    }
  
    return s1 + ' ' + s2; // If no overlap, return the strings separated by a space
}
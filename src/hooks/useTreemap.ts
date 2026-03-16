import { useMemo } from "react";
import {
  hierarchy,
  treemap,
  treemapSquarify,
  type HierarchyRectangularNode,
} from "d3-hierarchy";
import type { FileNode } from "../types/fileTree";
import { useAppStore } from "../store/appStore";
import { getFileCategory } from "../utils/fileCategories";

const MAX_RENDER_DEPTH = 4;

export interface TreemapNode {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  data: FileNode;
  depth: number;
  parent: TreemapNode | null;
}

function filterTree(node: FileNode, namePattern: string, minSize: number, selectedCategories: string[]): FileNode | null {
  if (node.isDir) {
    const filteredChildren = node.children
      .map((c) => filterTree(c, namePattern, minSize, selectedCategories))
      .filter((c): c is FileNode => c !== null);

    if (filteredChildren.length === 0 && node.children.length > 0) return null;

    return {
      ...node,
      children: filteredChildren,
      size: filteredChildren.reduce((sum, c) => sum + c.size, 0),
      childCount: filteredChildren.length,
    };
  }

  // File node - apply filters
  if (namePattern && !node.name.toLowerCase().includes(namePattern.toLowerCase())) {
    return null;
  }
  if (minSize > 0 && node.size < minSize * 1024 * 1024) {
    return null;
  }
  if (selectedCategories.length > 0) {
    const cat = getFileCategory(node.extension);
    if (!selectedCategories.includes(cat)) return null;
  }

  return node;
}

export function useTreemap(width: number, height: number) {
  const { rootNode, currentPath, pathIndex, filters } = useAppStore();

  const currentNode = useMemo(() => {
    if (!rootNode || !currentPath) return null;
    return pathIndex.get(currentPath) ?? rootNode;
  }, [rootNode, currentPath, pathIndex]);

  const filteredNode = useMemo(() => {
    if (!currentNode) return null;
    const { namePattern, minSize, selectedCategories } = filters;
    if (!namePattern && minSize === 0 && selectedCategories.length === 0) {
      return currentNode;
    }
    return filterTree(currentNode, namePattern, minSize, selectedCategories);
  }, [currentNode, filters]);

  const layoutNodes = useMemo(() => {
    if (!filteredNode || width <= 0 || height <= 0) return [];

    const root = hierarchy(filteredNode)
      .sum((d) => (d.isDir ? 0 : d.size))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const treemapLayout = treemap<FileNode>()
      .size([width, height])
      .tile(treemapSquarify.ratio(1.618))
      .paddingTop(20)
      .paddingInner(2)
      .paddingOuter(3)
      .round(true);

    treemapLayout(root);

    const nodes: TreemapNode[] = [];
    const collect = (node: HierarchyRectangularNode<FileNode>, depth: number) => {
      if (depth > MAX_RENDER_DEPTH) return;
      nodes.push({
        x0: node.x0,
        y0: node.y0,
        x1: node.x1,
        y1: node.y1,
        data: node.data,
        depth,
        parent: node.parent
          ? {
              x0: node.parent.x0,
              y0: node.parent.y0,
              x1: node.parent.x1,
              y1: node.parent.y1,
              data: node.parent.data,
              depth: depth - 1,
              parent: null,
            }
          : null,
      });
      if (node.children) {
        for (const child of node.children) {
          collect(child as HierarchyRectangularNode<FileNode>, depth + 1);
        }
      }
    };

    collect(root as HierarchyRectangularNode<FileNode>, 0);
    return nodes;
  }, [filteredNode, width, height]);

  return { layoutNodes, currentNode: filteredNode };
}

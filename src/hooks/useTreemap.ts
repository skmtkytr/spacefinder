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

  // Build a shallow tree with only direct children for a flat treemap view.
  // Directories appear as single blocks showing their aggregate size.
  const shallowNode = useMemo(() => {
    if (!filteredNode) return null;
    return {
      ...filteredNode,
      children: filteredNode.children.map((child) =>
        child.isDir
          ? { ...child, children: [] }
          : child,
      ),
    };
  }, [filteredNode]);

  const layoutNodes = useMemo(() => {
    if (!shallowNode || !filteredNode || width <= 0 || height <= 0) return [];

    const root = hierarchy(shallowNode)
      .sum((d) => (d.children.length > 0 ? 0 : d.size))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const treemapLayout = treemap<FileNode>()
      .size([width, height])
      .tile(treemapSquarify.ratio(1.618))
      .paddingInner(2)
      .paddingOuter(3)
      .round(true);

    treemapLayout(root);

    const nodes: TreemapNode[] = [];
    const typedRoot = root as HierarchyRectangularNode<FileNode>;
    // Only collect depth 0 (root container) and depth 1 (direct children)
    nodes.push({
      x0: typedRoot.x0,
      y0: typedRoot.y0,
      x1: typedRoot.x1,
      y1: typedRoot.y1,
      data: filteredNode,
      depth: 0,
      parent: null,
    });
    if (typedRoot.children) {
      for (const child of typedRoot.children) {
        const typedChild = child as HierarchyRectangularNode<FileNode>;
        // Restore original data (with children) for directories so click navigation works
        const originalChild = filteredNode.children.find(
          (c) => c.path === typedChild.data.path,
        );
        nodes.push({
          x0: typedChild.x0,
          y0: typedChild.y0,
          x1: typedChild.x1,
          y1: typedChild.y1,
          data: originalChild ?? typedChild.data,
          depth: 1,
          parent: null,
        });
      }
    }
    return nodes;
  }, [shallowNode, filteredNode, width, height]);

  return { layoutNodes, currentNode: filteredNode };
}

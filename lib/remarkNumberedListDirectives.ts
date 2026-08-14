type DirectiveNode = {
  type?: string;
  name?: string;
  data?: {
    hName?: string;
    hProperties?: Record<string, string>;
  };
  children?: DirectiveNode[];
};

export function remarkNumberedListDirectives() {
  return (tree: DirectiveNode) => {
    function visit(node: DirectiveNode) {
      if (node.type === "containerDirective" && node.name === "numbered-list") {
        node.data = node.data ?? {};
        node.data.hName = "div";
        node.data.hProperties = {
          className: "public-article-numbered-list",
        };
      }

      node.children?.forEach(visit);
    }

    visit(tree);
  };
}

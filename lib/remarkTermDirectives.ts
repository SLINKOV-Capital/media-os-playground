type DirectiveNode = {
  type?: string;
  name?: string;
  attributes?: Record<string, string | null | undefined>;
  data?: {
    hName?: string;
    hProperties?: Record<string, string>;
  };
  children?: DirectiveNode[];
};

export function remarkTermDirectives() {
  return (tree: DirectiveNode) => {
    function visit(node: DirectiveNode) {
      if (node.type === "textDirective" && node.name === "term") {
        const termName = node.attributes?.name?.trim();
        if (termName) {
          node.data = node.data ?? {};
          node.data.hName = "span";
          node.data.hProperties = { "data-term-name": termName };
        }
      }

      node.children?.forEach(visit);
    }

    visit(tree);
  };
}

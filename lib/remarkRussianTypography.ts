import Typograf from "typograf";

type MarkdownNode = {
  type?: string;
  value?: string;
  children?: MarkdownNode[];
};

const russianTypography = new Typograf({
  locale: "ru",
  disableRule: "*",
  enableRule: [
    "common/nbsp/afterShortWord",
    "common/nbsp/afterShortWordByList",
    "ru/nbsp/beforeParticle",
  ],
});

function typographTextNodes(node: MarkdownNode) {
  if (node.type === "text" && typeof node.value === "string") {
    node.value = russianTypography.execute(node.value);
    return;
  }

  for (const child of node.children ?? []) {
    typographTextNodes(child);
  }
}

export function remarkRussianTypography() {
  return (tree: MarkdownNode) => typographTextNodes(tree);
}

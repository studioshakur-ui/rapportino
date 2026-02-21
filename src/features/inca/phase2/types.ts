export type IncaFilter = {
  key: string;
  op: "contains" | "equals" | "is_null";
  value?: string;
};

export type IncaSort = {
  key: string;
  dir: "asc" | "desc";
};

export type IncaColumn = {
  key: string;
  label: string;
  group: string;
  visible: boolean;
  pinned?: boolean;
};

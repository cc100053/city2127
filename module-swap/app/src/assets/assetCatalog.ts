export type AssetCategory = "ground" | "lot" | "building" | "prop";
export type CompatibleSocket = "world" | "lot" | "building" | "none";

export type AssetId =
  | "ground-cross"
  | "lot-empty"
  | "lot-park"
  | "lot-plaza"
  | "building-basic-small"
  | "building-basic-medium"
  | "building-basic-tall"
  | "prop-kit";

export interface AssetDefinition {
  readonly id: AssetId;
  readonly url: string;
  readonly category: AssetCategory;
  readonly compatibleSocket: CompatibleSocket;
  readonly footprint: readonly [number, number];
  readonly rootName: string;
}

const modelUrl = (fileName: string): string =>
  `${import.meta.env.BASE_URL}assets/models/${fileName}`;

export const ASSET_CATALOG: Record<AssetId, AssetDefinition> = {
  "ground-cross": {
    id: "ground-cross",
    url: modelUrl("ground-cross.glb"),
    category: "ground",
    compatibleSocket: "world",
    footprint: [60, 60],
    rootName: "ROOT_GROUND_CROSS",
  },
  "lot-empty": {
    id: "lot-empty",
    url: modelUrl("lot-empty.glb"),
    category: "lot",
    compatibleSocket: "lot",
    footprint: [20, 20],
    rootName: "ROOT_LOT_EMPTY",
  },
  "lot-park": {
    id: "lot-park",
    url: modelUrl("lot-park.glb"),
    category: "lot",
    compatibleSocket: "lot",
    footprint: [20, 20],
    rootName: "ROOT_LOT_PARK",
  },
  "lot-plaza": {
    id: "lot-plaza",
    url: modelUrl("lot-plaza.glb"),
    category: "lot",
    compatibleSocket: "lot",
    footprint: [20, 20],
    rootName: "ROOT_LOT_PLAZA",
  },
  "building-basic-small": {
    id: "building-basic-small",
    url: modelUrl("building-basic-small.glb"),
    category: "building",
    compatibleSocket: "building",
    footprint: [8, 8],
    rootName: "ROOT_BUILDING_BASIC_SMALL",
  },
  "building-basic-medium": {
    id: "building-basic-medium",
    url: modelUrl("building-basic-medium.glb"),
    category: "building",
    compatibleSocket: "building",
    footprint: [12, 12],
    rootName: "ROOT_BUILDING_BASIC_MEDIUM",
  },
  "building-basic-tall": {
    id: "building-basic-tall",
    url: modelUrl("building-basic-tall.glb"),
    category: "building",
    compatibleSocket: "building",
    footprint: [12, 12],
    rootName: "ROOT_BUILDING_BASIC_TALL",
  },
  "prop-kit": {
    id: "prop-kit",
    url: modelUrl("prop-kit.glb"),
    category: "prop",
    compatibleSocket: "none",
    footprint: [26, 3],
    rootName: "ROOT_PROP_KIT",
  },
};

export const ALL_ASSET_IDS = Object.keys(ASSET_CATALOG) as AssetId[];

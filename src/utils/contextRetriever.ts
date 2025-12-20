// import fs from "fs";
// import path from "path";
// import { DiffSummary } from "./diffSummary";

// type IndexEntry = {
//   id: string;
//   symbols: string[];
//   content: string;
// };

// const INDEX_PATH = path.join(__dirname, "../data/fake.json"); // we replace with actuall context call

// function loadIndex(): IndexEntry[] {
//   const raw = fs.readFileSync(INDEX_PATH, "utf-8");
//   return JSON.parse(raw);
// }

// export async function getRelevantContext(
//   diffSummary: DiffSummary
// ): Promise<string[]> {
//   const index = loadIndex();

//   const queries = [
//     ...diffSummary.addedEndpoints,
//     ...diffSummary.modifiedEndpoints,
//   ];

//   const contextBlocks: string[] = [];

//   for (const entry of index) {
//     for (const q of queries) {
//       if (entry.symbols.some((s) => q.includes(s))) {
//         contextBlocks.push(entry.content);
//       }
//     }
//   }

//   return dedupe(contextBlocks);
// }

// function dedupe(arr: string[]) {
//   return Array.from(new Set(arr));
// }

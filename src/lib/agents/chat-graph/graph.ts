import { StateGraph, END } from "@langchain/langgraph";
import { ChatGraphAnnotation } from "./state";
import { assessState } from "./nodes/assess-state";
import { retrieveHistory } from "./nodes/retrieve-history";
import { assessEvent } from "./nodes/assess-event";
import { decideAction } from "./nodes/decide-action";
import { assessDiary } from "./nodes/assess-diary";
import { generateResponse } from "./nodes/generate-response";

const graph = new StateGraph(ChatGraphAnnotation)
  .addNode("assess_state", assessState)
  .addNode("retrieve_history", retrieveHistory)
  .addNode("assess_event", assessEvent)
  .addNode("decide_action", decideAction)
  .addNode("assess_diary", assessDiary)
  .addNode("generate_response", generateResponse)

  // START → assess_state
  .addEdge("__start__", "assess_state")

  // assess_state → 按需决定是否检索历史
  .addConditionalEdges("assess_state", (state) =>
    state.needsHistory ? "retrieve_history" : "assess_event"
  )

  // retrieve_history → assess_event
  .addEdge("retrieve_history", "assess_event")

  // assess_event → decide_action
  .addEdge("assess_event", "decide_action")

  // decide_action → 按 userState 决定是否进入 assess_diary
  .addConditionalEdges("decide_action", (state) => {
    if (
      state.userState === "wrapping" ||
      state.userState === "ending"
    ) {
      return "assess_diary";
    }
    return "generate_response";
  })

  // assess_diary → generate_response
  .addEdge("assess_diary", "generate_response")

  // generate_response → END
  .addEdge("generate_response", END);

export const chatGraph = graph.compile();

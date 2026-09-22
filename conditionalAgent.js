/**
 * an agent that will select which path to take using a processing node
 * structure:     Start
 *                  |
 *              processing node       a fork in the path
 *                /    \
 *             pathA    pathB
 *                |      |
 *               End    End
 */             

import { START, StateGraph, END } from "@langchain/langgraph";

const processingNode = state => {
    const {path} = state // we'll pass path variable in state
    if(path === 'A') return 'A' //simple just A and B node
    if(path === "B") return "B"
}

const nodeA = state => {
    console.log("=".repeat(60))
    console.log("I am in node A")
    console.log("=".repeat(60))
}

const nodeB = state => {
    console.log("=".repeat(60))
    console.log("I am in node B")
    console.log("=".repeat(60))
}

const conditionalGraph = () => {
    const workflow = new StateGraph({
        channels: {
            path: {
                reducer: (x,y) => y ?? x,
                default: () => 'A' //pass default path here
            }
        }
    })
    .addNode('node_a', nodeA)
    .addNode('node_b', nodeB)
    //no need to add processing node
    .addConditionalEdges(START, processingNode, {   //most imp
                        //select starting point as START node, then from processing node the return value is obtained
                        //and used to route to the required node
        "A": "node_a",  //node A
        "B": "node_b"  // node B
    })
    .addEdge("node_a", END)
    .addEdge("node_b", END)
    //make sure both nodes has end node, so the path ends, otherwise
    //it will crash
    return workflow.compile()
}

const main = async state => {
    const graph = conditionalGraph() //it is not a contructor, REMEMBER :)
    const res = await graph.invoke({
        path: "B" // lets pass B
    })
    // console.log(res)
}

main().catch(console.error)
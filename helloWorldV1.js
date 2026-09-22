// simple hello world agent, without using a llm

/**
 * graph will be structured as START
 *                              |
 *                           hello world node
 *                              |
 *                              END
 */

import { StateGraph, START, END } from '@langchain/langgraph'

const helloWorldNode = state => { //takes state as input
    console.log("=".repeat(60))
    console.log("Hello world agent")  //simple console.log is enough for now
    console.log("=".repeat(60))
    return {
        message: "hello world"
    } //have to return state
}

const testGraph = () => {
    const workflow = new StateGraph({
        channels: {
            message: {
                reducer: (curr, next) => next ?? curr,
                default: () => ""
            }
        }
    })
    .addNode("hello_world_node", helloWorldNode)
    .addEdge(START, "hello_world_node")
    .addEdge("hello_world_node", END)

    //langraph uses directed acyclic graph, so make sure to follow one direction when linking 
    //the nodes
    return workflow.compile() //have to return this
}

const main = async() => {
    const graph = testGraph()
    const res = await graph.invoke({
        message: "" //initial state
    })
    console.log(res)
}

main().catch(console.error)

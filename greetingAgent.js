//simple greeting agent using a 
// 3B param local model (qwen2.5-vl)

import { StateGraph, START, END } from "@langchain/langgraph"
import {ChatOpenAI} from '@langchain/openai' //class used to create connection to llm
//when using llama cpp

/**
 * structure:    Start
 *                  |
 *                greeting node
 *                  |
 *                 End
 */

const llm = new ChatOpenAI({
    configuration: {
        baseURL: "http://localhost:8080/v1" //required for llamacpp
    },
    apiKey: "no need" //no need for api key
})

const greetingNode = async state => {
    const {name} = state
    const res = await llm.invoke([
        {
            role: "system",
            content: `
                You are a warm greeting assistant,
                provided the user input, you should greet the user warmly.
            ` //simple system prompt
        },
        {
            role: "human",
            content: `hello my name is ${name}`
        }
    ])
    return {
        response: res.content
    }
}

const greetingGraph  = () => {
    const workflow = new StateGraph({
        channels: {
            name: {
                reducer: (curr, next) => next ?? curr,
                default: () => ''
            },
            response: {
                reducer: (curr, next) => next ?? curr,
                default: () => ''
            },
        }
    })
    .addNode("greeting_node", greetingNode)
    .addEdge(START, "greeting_node")
    .addEdge("greeting_node", END)
    return workflow.compile()
}

const main = async() => {
    //invoking the graph here
    const initialState = {
        name: "risabh",
        response: ''
    }
    const graph = greetingGraph()
    const res = await graph.invoke(initialState)
    console.log(res)
}

main().catch(console.error)
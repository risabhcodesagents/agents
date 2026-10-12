//tools
import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import * as z from 'zod'

const llm = new ChatOpenAI({
    configuration: {
        baseURL: "http://localhost:8080/v1"
    },
    apiKey: 'no need',
    temperature: 0
})

const calculator = tool(
    async ({ exp }) => eval(exp),
    {
        name: "calculator",
        description: "calculates mathematical expression",
        schema: z.object({
            exp: z.string().describe("the mathematical expression to be provided")
        })
    }
)

const tools = {
    calculator: calculator
}

const llmWithTools = llm.bindTools([calculator])

const router = state => {
    const { toolCalls } = state
    if (toolCalls && toolCalls.length > 0) return 'tool'
    return 'end'
}

const llmCallNode = async (state) => {
    // console.log("i am in llm call node", state)
    const { messages } = state
    const res = await llmWithTools.invoke(messages)
    // console.log("res", res)
    if (res.tool_calls.length > 0 && res.tool_calls) {
        return {
            toolCalls: res.tool_calls
        }
    }
    return {
        messages: [
            {
                role: 'ai',
                content: res.content
            }
        ]
    }
    // console.log(res)
}

const toolNode = async state => {
    // console.log("i am in tool node", state)
    const { toolCalls } = state
    const toolMessages = []
    for await (let tool of toolCalls) {
        const res = await tools[tool.name].invoke(tool.args)
        toolMessages.push({
            role: "tool",
            tool_call_id: tool.id,
            content: `${res}`
        })
    }
    return {
        messages: [
            ...toolMessages
        ],
        toolCalls: []
    }
}

const toolGraph = () => {
    const workflow = new StateGraph({
        channels: {
            messages: {
                reducer: (x, y) => x.concat(y),
                default: () => []
            },
            toolCalls: {
                reducer: (x, y) => y ?? x,
                default: () => []
            }
        }
    })
        .addNode("llm_call_node", llmCallNode)
        .addNode('tool_node', toolNode)
        .addEdge(START, 'llm_call_node')
        .addConditionalEdges("llm_call_node", router, {
            tool: "tool_node",
            end: "__end__"
        })
        .addEdge("tool_node", "llm_call_node")
    return workflow.compile()
}

const main = async () => {
    const initialState = {
        messages: [
            {
                role: "system",
                content: `
                    You are a helpful AI assistant,
                    You have provided with the "calculator" tool to calculate result 
                    and provide to user.
                    You will be provided an expression from the user
                `
            },
            // {
            //     role: "human",
            //     content: "what is 32*1024*46692?"
            // },
            {
                role: "human", 
                content: "who are you"
            }
        ],
        toolCalls: []
    }
    const graph = toolGraph()
    const res = await graph.invoke(initialState)
    console.log(res)
}

main().catch(console.error)
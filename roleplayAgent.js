/**
 * Roleplay agent
 * structure:               Start
 *                          |
 *                      system_generation_node
 *                          |
 *                        chat_node
 *                          |
 *                        End
 */

import  {StateGraph, START, END} from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'

const llm = new ChatOpenAI({
    configuration: {
        baseURL: 'http://localhost:8080/v1'
    },
    apiKey: "no need"
})

const systemGenerationNode = async state => {
    const {char} = state //character provided by user
    const res = await llm.invoke([
        {
            role: "system",
            content: `
                You are a system prompt generator,
                provided will be character name, you have to generate a system prompt based on it
                RETURN ONLY PROMPT NOTHING ELSE
            `
        },
        {
            role: "human",
            content: `provide me a system prompt for a llm for this character ${char}`
        }
    ])
    // console.log(res)
    return {
        system: res.content
    }
}

const chatNode = async state => {
    const {system, prompt} = state
    //stream the response
    const res = await llm.stream([
        {role: "system", content: system},
        {role: "human", content: prompt}
    ])
    for await (let chunk of res) {
        process.stdout.write(chunk.content)
    }
    return state
}

const roleplayGraph = () => {
    const workflow = new StateGraph({
        channels: {
            char: {
                reducer: (x,y) => y ?? x,
                default: () => ''
            },
            system: {
                reducer: (x,y) => y ?? x,
                default: () => ''
            },
            prompt: {
                reducer: (x,y) => y ?? x,
                default: () => ''
            },
        }
    })
    .addNode('system_generation_node', systemGenerationNode)
    .addNode("chat_node", chatNode)
    .addEdge(START, "system_generation_node")
    .addEdge("system_generation_node", "chat_node")
    .addEdge("chat_node", END)
    return workflow.compile()
}

const main = async() => {
    const initialState = {
        char: "sleepy cat",
        system: '',
        prompt: "why are so sleepy all the time?"
    }
    const graph = roleplayGraph()
    const res = await graph.invoke(initialState)
    // console.log(res)
}

main().catch(console.error)
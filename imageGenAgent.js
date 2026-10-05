/**
 * structure:       START
 *                     |
 *                  prompt_gen_node
 *                     |
 *                  image_creation_node
 *                      |
 *                   image_save_node //can be used for
 *                      previews as well
 *                      |
 *                     END
 */

import { StateGraph, START, END } from "@langchain/langgraph"
import { ChatOpenAI } from "@langchain/openai"
import terminalImage from "terminal-image"
import fs from 'fs/promises'
import path from 'path'

const llm = new ChatOpenAI({
    model: "qwen2.5",
    configuration: {
        baseURL: "http://localhost:8080/v1"
    },
    apiKey: "no need"
})

const promptGenNode = async state => { //first node
    const { prompt } = state
    const system = `
        You are a prompt enhancer for z image turbo model
        Provided will be a prompt from user, make it detailed
        and coherent to be used in z image turbo model
        RETURN ONLY THE PROMPT, NOTHING ELSE
    `
    const res = await llm.invoke([
        {
            role: "system",
            content: system
        },
        {
            role: "human",
            content: prompt
        }
    ])
    console.log(res.content)
    const unloading = await fetch('http://localhost:8080/models/unload', {
        method: "POST",
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify({
            model: "qwen2.5"
        })
    })
    const data = await unloading.json()
    console.log("unload", data)
    return {
        enhancedPrompt: res.content
    }
}

//second node -- image creation node
const imageCreationNode = async state => {
    const { enhancedPrompt } = state
    //will use fetch
    //endpoint -- sdapi/v1/txt2img
    const res = await fetch("http://localhost:8081/sdapi/v1/txt2img", {
        method: "POST",
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify({ //insert all params here
            prompt: enhancedPrompt,
            steps: 6, //for z image turbo model 6 is enough
            batch_size: 2, //number of images
            width: 1024,
            height: 1024,
            cfg_scale: 1, //required for z image turbo model
            sampler_name: "euler"
        })
    })
    if (res.ok) {
        const { images } = await res.json() //it return b64 strings for images
        const buffers = images?.map(image => Buffer.from(image, 'base64'))
        //store those buffers
        return {
            buffers: buffers
        }
    }
}

//image save/preview node
const imageSaveNode = async state => {
    const { buffers, saveImage } = state
    //preview
    buffers.forEach(async image => {
        console.log(await terminalImage.buffer(image))
    })
    //save
    if (saveImage) {
        buffers.forEach(async (image, index) => {
            await fs.writeFile(path.join(import.meta.dirname, 'assets', `${index}.png`), image)
        })
    }
    return state
}

const imageGenGraph = () => {
    const workflow = new StateGraph({
        channels: {
            prompt: { //user prompt
                reducer: (x, y) => y ?? x,
                default: () => ""
            },
            enhancedPrompt: { //will be formatted in proper
                //format for z image model
                reducer: (x, y) => y ?? x,
                default: () => ""
            },
            buffers: {
                reducer: (x, y) => y ?? x,
                default: () => [] //empty array
            },
            saveImage: {
                reducer: (x, y) => y ?? x,
                default: () => false //false = preview true=save
            }
        }
    })
        .addNode("prompt_gen_node", promptGenNode)
        .addNode("image_creation_node", imageCreationNode)
        .addNode('image_save_node', imageSaveNode)
        .addEdge(START, 'prompt_gen_node')
        .addEdge("prompt_gen_node", "image_creation_node")
        .addEdge("image_creation_node", 'image_save_node')
        .addEdge("image_save_node", END)
    return workflow.compile()
}

const main = async () => {
    const initialState = {
        prompt: "a cat with fire on its tail"
    }
    const graph = imageGenGraph()
    const res = await graph.invoke(initialState)
    console.log(res)
}

main().catch(console.error)
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
大模型使用示例程序
展示如何使用大模型生成文本、流式输出和管理对话历史
"""
from config.llm_config import llm_config
from src.llm.factory import LLMFactory


def main():
    """
    主程序入口
    """
    print("=== 大模型使用示例 ===")
    
    # 创建模型实例
    model = LLMFactory.create_model(llm_config)
    
    print(f"\n当前使用模型类型: {llm_config.get('type')}")
    
    # 示例1: 简单文本生成
    print("\n=== 示例1: 简单文本生成 ===")
    prompt1 = "你好，能介绍一下自己吗？"
    print(f"用户: {prompt1}")
    response1 = model.generate(prompt1)
    print(f"模型: {response1}")
    
    # 示例2: 流式生成
    print("\n=== 示例2: 流式生成 ===")
    prompt2 = "请简要介绍一下人工智能的发展历程。"
    print(f"用户: {prompt2}")
    print("模型: ", end="", flush=True)
    
    stream_response = model.stream_generate(prompt2)
    for chunk in stream_response:
        print(chunk, end="", flush=True)
    print()
    
    # 示例3: 对话历史管理
    print("\n=== 示例3: 对话历史管理 ===")
    history = [
        {"role": "user", "content": "你好，我叫小明。"},
        {"role": "assistant", "content": "你好，小明！很高兴认识你。"}
    ]
    
    prompt3 = "我想学习Python编程，你有什么建议吗？"
    print(f"用户: {prompt3}")
    response3 = model.generate(prompt3, history)
    print(f"模型: {response3}")
    
    # 更新对话历史
    history.append({"role": "user", "content": prompt3})
    history.append({"role": "assistant", "content": response3})
    
    # 继续对话
    prompt4 = "那我应该从哪个资源开始学习呢？"
    print(f"\n用户: {prompt4}")
    response4 = model.generate(prompt4, history)
    print(f"模型: {response4}")
    
    # 关闭模型连接
    model.close()
    print("\n=== 示例结束 ===")


if __name__ == "__main__":
    main()
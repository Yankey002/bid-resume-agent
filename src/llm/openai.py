#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OpenAI兼容模型实现
支持OpenAI、DeepSeek、智谱清言等兼容OpenAI API的模型
"""
from typing import List, Dict, Any, Optional, Generator
from openai import OpenAI
from src.llm.base import LLMBase


class OpenAIModel(LLMBase):
    """
    OpenAI兼容模型实现
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        初始化OpenAI兼容模型
        
        Args:
            config: 模型配置字典
        """
        super().__init__(config)
        
        # 根据模型类型选择配置
        model_type = config.get("type", "openai")
        model_config = config.get(model_type, config.get("openai"))
        
        # 初始化OpenAI客户端
        self.client = OpenAI(
            api_key=model_config.get("api_key"),
            base_url=model_config.get("base_url"),
        )
        
        # 模型参数
        self.model = model_config.get("model")
        self.temperature = model_config.get("temperature", 0.1)
        self.max_tokens = model_config.get("max_tokens", 1000)
    
    def generate(self, prompt: str, history: Optional[List[Dict[str, str]]] = None) -> str:
        """
        生成文本响应
        
        Args:
            prompt: 提示文本
            history: 对话历史
        
        Returns:
            模型生成的文本响应
        """
        # 构建对话消息
        messages = []
        
        # 添加历史对话
        if history:
            messages.extend(history)
        
        # 添加当前提示
        messages.append({"role": "user", "content": prompt})
        
        # 调用模型
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
        )
        
        # 返回生成的文本
        return response.choices[0].message.content
    
    def stream_generate(self, prompt: str, history: Optional[List[Dict[str, str]]] = None) -> Generator[str, None, None]:
        """
        流式生成文本响应
        
        Args:
            prompt: 提示文本
            history: 对话历史
        
        Returns:
            生成器，产生流式响应
        """
        # 构建对话消息
        messages = []
        
        # 添加历史对话
        if history:
            messages.extend(history)
        
        # 添加当前提示
        messages.append({"role": "user", "content": prompt})
        
        # 调用模型，启用流式输出
        stream = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            stream=True,
        )
        
        # 逐块生成响应
        for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                yield content
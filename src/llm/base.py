#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
大模型基础抽象类
定义统一的模型调用接口
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional


class LLMBase(ABC):
    """
    大模型基础抽象类，所有模型实现必须继承此类
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        初始化模型
        
        Args:
            config: 模型配置字典
        """
        self.config = config
    
    @abstractmethod
    def generate(self, prompt: str, history: Optional[List[Dict[str, str]]] = None) -> str:
        """
        生成文本响应
        
        Args:
            prompt: 提示文本
            history: 对话历史，格式为 [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
        
        Returns:
            模型生成的文本响应
        """
        pass
    
    @abstractmethod
    def stream_generate(self, prompt: str, history: Optional[List[Dict[str, str]]] = None) -> Any:
        """
        流式生成文本响应
        
        Args:
            prompt: 提示文本
            history: 对话历史
        
        Returns:
            生成器，产生流式响应
        """
        pass
    
    def format_history(self, history: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """
        格式化对话历史
        
        Args:
            history: 原始对话历史
        
        Returns:
            格式化后的对话历史
        """
        return history
    
    def close(self):
        """
        关闭模型连接，释放资源
        """
        pass
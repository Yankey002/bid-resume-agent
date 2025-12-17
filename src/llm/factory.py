#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
大模型工厂类
用于创建不同类型的模型实例
"""
from typing import Dict, Any
from src.llm.base import LLMBase
from src.llm.openai import OpenAIModel


class LLMFactory:
    """
    大模型工厂类，用于创建不同类型的模型实例
    """
    
    @staticmethod
    def create_model(config: Dict[str, Any]) -> LLMBase:
        """
        创建模型实例
        
        Args:
            config: 模型配置字典
        
        Returns:
            模型实例
        
        Raises:
            ValueError: 不支持的模型类型
        """
        model_type = config.get("type", "openai")
        
        # 目前所有模型都使用OpenAI兼容实现
        # 未来可以根据需要添加其他实现
        if model_type in ["openai", "deepseek", "zhipu"]:
            return OpenAIModel(config)
        else:
            raise ValueError(f"不支持的模型类型: {model_type}")
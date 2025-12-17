#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
大模型配置文件
支持多种模型：OpenAI、DeepSeek、智谱清言等
"""
from src.utils.env import get_env

# 大模型配置
llm_config = {
    # 模型类型: openai, deepseek, zhipu
    "type": get_env("LLM_TYPE", "deepseek"),
    
    # OpenAI 兼容模型配置
    "openai": {
        "model": get_env("OPENAI_MODEL", "gpt-4o-mini"),
        "api_key": get_env("OPENAI_API_KEY"),
        "base_url": get_env("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        "temperature": float(get_env("OPENAI_TEMPERATURE", "0.1")),
        "max_tokens": int(get_env("OPENAI_MAX_TOKENS", "1000")),
    },
    
    # DeepSeek 模型配置
    "deepseek": {
        "model": get_env("DEEPSEEK_MODEL", "deepseek-chat"),
        "api_key": get_env("DEEPSEEK_API_KEY"),
        "base_url": get_env("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1"),
        "temperature": float(get_env("DEEPSEEK_TEMPERATURE", "0.1")),
        "max_tokens": int(get_env("DEEPSEEK_MAX_TOKENS", "1000")),
    },
    
    # 智谱清言模型配置
    "zhipu": {
        "model": get_env("ZHIPU_MODEL", "glm-4"),
        "api_key": get_env("ZHIPU_API_KEY"),
        "base_url": get_env("ZHIPU_BASE_URL", "https://open.bigmodel.cn/api/paas/v4"),
        "temperature": float(get_env("ZHIPU_TEMPERATURE", "0.1")),
        "max_tokens": int(get_env("ZHIPU_MAX_TOKENS", "1000")),
    }
}
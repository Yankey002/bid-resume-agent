#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
环境变量管理工具
"""
import os


def get_env(key: str, default: str = None) -> str:
    """
    获取环境变量，如果不存在则返回默认值
    
    Args:
        key: 环境变量名称
        default: 默认值
    
    Returns:
        环境变量值或默认值
    """
    return os.getenv(key, default)
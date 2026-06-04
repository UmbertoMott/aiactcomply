"""
AIComply LogVault SDK — Python Package
EU AI Act Art. 12 compliance logging

Install:
    pip install -e .

Or from PyPI (future):
    pip install aicomply-logvault
"""

from setuptools import setup, find_packages

setup(
    name="aicomply-logvault",
    version="1.0.0",
    description="AIComply LogVault SDK — EU AI Act Art. 12 compliance logging",
    long_description=open("README.md").read() if __import__("os").path.exists("README.md") else "",
    author="AIComply",
    url="https://aicomply-omega.vercel.app",
    py_modules=["aicomply_logvault", "aicomply_llamaindex"],
    python_requires=">=3.9",
    install_requires=[
        "requests>=2.28.0",
    ],
    extras_require={
        "openai":     ["openai>=1.0.0"],
        "langchain":  ["langchain-core>=0.1.0"],
        "llamaindex": ["llama-index-core>=0.10.0"],
        "all":        ["openai>=1.0.0", "langchain-core>=0.1.0", "llama-index-core>=0.10.0"],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
    keywords="eu-ai-act compliance logging langchain llamaindex openai",
)

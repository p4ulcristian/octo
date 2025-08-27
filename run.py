#!/usr/bin/env python3

import os
import sys

def main():
    # Activate virtual environment
    venv_python = os.path.join('venv', 'bin', 'python')
    if os.path.exists(venv_python):
        os.execv(venv_python, [venv_python, 'main.py'])
    else:
        print("Virtual environment not found. Please run:")
        print("python3 -m venv venv")
        print("source venv/bin/activate")
        print("pip install -r requirements.txt")
        sys.exit(1)

if __name__ == '__main__':
    main()
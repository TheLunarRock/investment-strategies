#!/bin/bash

# Plan C 暴落判定アプリ起動スクリプト

# カラー出力
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📊 Plan C 暴落判定アプリ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "起動中..."
echo ""

# 仮想環境を有効化
source venv/bin/activate

# Streamlitアプリを起動
streamlit run plan_c_app.py

# 終了時
deactivate

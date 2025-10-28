"""
Plan C 暴落判定アプリ（月15日買付版 - 日米別判定）
VIX・株価変動率を自動取得、バフェット指数のみ手動入力
日本市場と米国市場を別々に判定
"""

import streamlit as st
import yfinance as yf
from datetime import datetime, timedelta
import pandas as pd
import requests

# ページ設定
st.set_page_config(
    page_title="Plan C 暴落判定（日米別判定）",
    page_icon="📊",
    layout="wide"
)

# ===== LINE Notify送信関数 =====
def send_line_notify(message):
    """
    LINE Notifyでメッセージを送信

    Parameters:
    -----------
    message : str
        送信するメッセージ

    Returns:
    --------
    bool : 送信成功ならTrue、失敗ならFalse
    """
    try:
        # Streamlit Secretsからトークンを取得
        if "line_notify_token" not in st.secrets:
            return False

        line_token = st.secrets["line_notify_token"]

        # LINE Notify API
        url = "https://notify-api.line.me/api/notify"
        headers = {"Authorization": f"Bearer {line_token}"}
        data = {"message": message}

        response = requests.post(url, headers=headers, data=data)

        return response.status_code == 200
    except Exception as e:
        st.error(f"LINE通知エラー: {str(e)}")
        return False

# タイトル
st.title("📊 Plan C 暴落判定アプリ（日米別判定版）")
st.markdown("**毎月14日に実施** - 翌15日の投資額と配分を決定")

# 現在日付表示
today = datetime.now().strftime("%Y年%m月%d日")
st.info(f"判定日: {today}")

st.markdown("---")

# ===== ベース金額設定 =====
st.subheader("💰 月次投資額の設定")

base_amount = st.number_input(
    "通常時の月次投資額（円）",
    min_value=10000,
    max_value=10000000,
    value=300000,
    step=10000,
    help="毎月15日に自動買付される金額。この金額の30%が日本資産、70%が海外資産に配分されます。"
)

# 資産配分比率（固定）
JP_RATIO = 0.30  # 日本資産 30%
OS_RATIO = 0.70  # 海外資産 70%

# 各資産クラスの配分比率（通常時の300k円ベース）
FUND_RATIOS = {
    "jp_stock": 0.15,      # 国内株式 15%
    "jp_reit": 0.10,       # 国内REIT 10%
    "jp_bond": 0.05,       # 国内債券 5%
    "global_stock": 0.40,  # 全世界株式 40%
    "us_stock": 0.15,      # 米国株式 15%
    "os_reit": 0.10,       # 先進国REIT 10%
    "os_bond": 0.05        # 先進国債券 5%
}

# つみたて投資枠の上限
TSUMITATE_LIMIT = 100000

# 金額計算（1,000円単位に丸める）
def round_to_1000(value):
    return int(round(value / 1000) * 1000)

# 各ファンドの金額を計算
jp_stock = round_to_1000(base_amount * FUND_RATIOS["jp_stock"])
jp_reit = round_to_1000(base_amount * FUND_RATIOS["jp_reit"])
jp_bond = round_to_1000(base_amount * FUND_RATIOS["jp_bond"])
global_stock_total = round_to_1000(base_amount * FUND_RATIOS["global_stock"])
us_stock = round_to_1000(base_amount * FUND_RATIOS["us_stock"])
os_reit = round_to_1000(base_amount * FUND_RATIOS["os_reit"])
os_bond = round_to_1000(base_amount * FUND_RATIOS["os_bond"])

# グローバル株式をつみたて投資枠と成長投資枠に分割
if global_stock_total <= TSUMITATE_LIMIT:
    global_stock_tsumitate = global_stock_total
    global_stock_growth = 0
else:
    global_stock_tsumitate = TSUMITATE_LIMIT
    global_stock_growth = global_stock_total - TSUMITATE_LIMIT

# 日本資産・海外資産の合計
jp_total = jp_stock + jp_reit + jp_bond
os_total = global_stock_total + us_stock + os_reit + os_bond

# 暴落用資金（ベース金額と同額を追加投資用として確保）
crash_fund_jp = round_to_1000(base_amount * JP_RATIO)
crash_fund_os = round_to_1000(base_amount * OS_RATIO)

# 配分表示
col1, col2, col3 = st.columns(3)
with col1:
    st.metric("日本資産（30%）", f"{jp_total:,}円")
with col2:
    st.metric("海外資産（70%）", f"{os_total:,}円")
with col3:
    st.metric("合計", f"{base_amount:,}円")

st.markdown(f"""
**暴落時の追加投資用資金配分:**
- 日本市場暴落時: +{crash_fund_jp:,}円（日本資産のみ）
- 米国市場暴落時: +{crash_fund_os:,}円（海外資産のみ）
- 両市場暴落時: +{base_amount:,}円（全資産）
""")

st.markdown("---")

# ===== VIX指数取得（共通）=====
st.subheader("📈 VIX指数（共通指標）")

with st.spinner("VIX指数を取得中..."):
    try:
        vix_ticker = yf.Ticker("^VIX")
        vix_data = vix_ticker.history(period="5d")

        if not vix_data.empty:
            vix_value = vix_data['Close'].iloc[-1]
            vix_condition = vix_value > 30

            col1, col2 = st.columns(2)
            with col1:
                st.metric(
                    label="現在のVIX",
                    value=f"{vix_value:.2f}",
                    delta=f"基準: 30以上"
                )
            with col2:
                if vix_condition:
                    st.success("✅ VIX > 30（恐怖指数上昇）")
                else:
                    st.info("❌ VIX ≤ 30（通常範囲）")
        else:
            st.error("❌ VIXデータの取得に失敗しました")
            vix_value = None
            vix_condition = False

    except Exception as e:
        st.error(f"❌ VIX取得エラー: {e}")
        vix_value = None
        vix_condition = False

st.markdown("---")

# ===== 左右2列：日本市場 vs 米国市場 =====
col_jp, col_us = st.columns(2)

# ===== 日本市場判定 =====
with col_jp:
    st.subheader("🇯🇵 日本市場")

    # バフェット指数（日本）
    st.markdown("**バフェット指数（日本）**")
    st.markdown("[日本バフェット指数](https://nikkeiyosoku.com/buffett/)で確認")

    buffett_jp = st.number_input(
        "日本バフェット指数（%）",
        min_value=0.0,
        max_value=300.0,
        value=120.0,
        step=0.1,
        key="buffett_jp",
        help="nikkeiyosoku.comで確認"
    )

    buffett_jp_condition = buffett_jp < 80
    if buffett_jp_condition:
        st.success(f"✅ {buffett_jp:.1f}% < 80%（割安）")
    else:
        st.info(f"❌ {buffett_jp:.1f}% ≥ 80%（通常）")

    st.markdown("---")

    # 日経平均（3ヶ月変動率）
    st.markdown("**日経平均（3ヶ月変動率）**")

    with st.spinner("日経平均を取得中..."):
        try:
            nikkei = yf.Ticker("^N225")
            nikkei_hist = nikkei.history(period="6mo")

            if len(nikkei_hist) >= 60:
                nikkei_current = nikkei_hist['Close'].iloc[-1]
                nikkei_3m_ago = nikkei_hist['Close'].iloc[-60]
                nikkei_change = ((nikkei_current - nikkei_3m_ago) / nikkei_3m_ago) * 100

                st.metric(
                    label="日経平均（3ヶ月変動）",
                    value=f"{nikkei_change:+.2f}%",
                    delta="基準: -20%以下"
                )

                nikkei_condition = nikkei_change <= -20
                if nikkei_condition:
                    st.success(f"✅ {nikkei_change:.2f}% ≤ -20%（大幅下落）")
                else:
                    st.info(f"❌ {nikkei_change:.2f}% > -20%（通常）")
            else:
                st.warning("⚠️ 日経平均データ不足")
                nikkei_change = None
                nikkei_condition = False

        except Exception as e:
            st.error(f"❌ 日経平均取得エラー: {e}")
            nikkei_change = None
            nikkei_condition = False

    st.markdown("---")

    # 日本市場総合判定
    jp_crash = vix_condition and buffett_jp_condition and nikkei_condition

    if jp_crash:
        st.error("🚨 **日本市場：暴落**")
    else:
        st.success("✅ **日本市場：通常**")

# ===== 米国市場判定 =====
with col_us:
    st.subheader("🇺🇸 米国（世界）市場")

    # バフェット指数（米国）
    st.markdown("**バフェット指数（米国）**")
    st.markdown("[米国バフェット指数](https://nikkeiyosoku.com/buffett_us/)で確認")

    buffett_us = st.number_input(
        "米国バフェット指数（%）",
        min_value=0.0,
        max_value=300.0,
        value=180.0,
        step=0.1,
        key="buffett_us",
        help="nikkeiyosoku.comで確認"
    )

    buffett_us_condition = buffett_us < 80
    if buffett_us_condition:
        st.success(f"✅ {buffett_us:.1f}% < 80%（割安）")
    else:
        st.info(f"❌ {buffett_us:.1f}% ≥ 80%（通常）")

    st.markdown("---")

    # S&P500（3ヶ月変動率）
    st.markdown("**S&P500（3ヶ月変動率）**")

    with st.spinner("S&P500を取得中..."):
        try:
            sp500 = yf.Ticker("^GSPC")
            sp500_hist = sp500.history(period="6mo")

            if len(sp500_hist) >= 60:
                sp500_current = sp500_hist['Close'].iloc[-1]
                sp500_3m_ago = sp500_hist['Close'].iloc[-60]
                sp500_change = ((sp500_current - sp500_3m_ago) / sp500_3m_ago) * 100

                st.metric(
                    label="S&P500（3ヶ月変動）",
                    value=f"{sp500_change:+.2f}%",
                    delta="基準: -20%以下"
                )

                sp500_condition = sp500_change <= -20
                if sp500_condition:
                    st.success(f"✅ {sp500_change:.2f}% ≤ -20%（大幅下落）")
                else:
                    st.info(f"❌ {sp500_change:.2f}% > -20%（通常）")
            else:
                st.warning("⚠️ S&P500データ不足")
                sp500_change = None
                sp500_condition = False

        except Exception as e:
            st.error(f"❌ S&P500取得エラー: {e}")
            sp500_change = None
            sp500_condition = False

    st.markdown("---")

    # 米国市場総合判定
    us_crash = vix_condition and buffett_us_condition and sp500_condition

    if us_crash:
        st.error("🚨 **米国市場：暴落**")
    else:
        st.success("✅ **米国市場：通常**")

st.markdown("---")

# ===== 最終判定結果（4パターン） =====
st.subheader("🎯 最終判定結果と投資指示")

# 4パターン判定
if not jp_crash and not us_crash:
    # パターン1: 両方通常
    pattern = "pattern1"
    st.success("✅ **両市場とも通常（作業なし）**")

    st.markdown(f"""
    ### 💰 15日の自動買付（通常{base_amount:,}円のみ）
    追加作業なし - 以下の金額が自動で買付されます。
    """)

    # 銘柄別買付金額表
    fund_names = [
        "eMAXIS Slim 国内株式（TOPIX）",
        "eMAXIS Slim 国内リートインデックス",
        "eMAXIS Slim 国内債券インデックス",
    ]
    fund_regular = [f"{jp_stock:,}円", f"{jp_reit:,}円", f"{jp_bond:,}円"]
    fund_additional = ["－", "－", "－"]
    fund_total = [f"{jp_stock:,}円", f"{jp_reit:,}円", f"{jp_bond:,}円"]

    # グローバル株式の処理
    if global_stock_growth > 0:
        fund_names.extend([
            "eMAXIS Slim 全世界株式【つみたて投資枠】",
            "eMAXIS Slim 全世界株式【成長投資枠】"
        ])
        fund_regular.extend([f"{global_stock_tsumitate:,}円", f"{global_stock_growth:,}円"])
        fund_additional.extend(["－", "－"])
        fund_total.extend([f"{global_stock_tsumitate:,}円", f"{global_stock_growth:,}円"])
    else:
        fund_names.append("eMAXIS Slim 全世界株式（除く日本）")
        fund_regular.append(f"{global_stock_total:,}円")
        fund_additional.append("－")
        fund_total.append(f"{global_stock_total:,}円")

    # 残りのファンド
    fund_names.extend([
        "eMAXIS Slim 米国株式（S&P500）",
        "eMAXIS Slim 先進国リートインデックス",
        "eMAXIS Slim 先進国債券インデックス"
    ])
    fund_regular.extend([f"{us_stock:,}円", f"{os_reit:,}円", f"{os_bond:,}円"])
    fund_additional.extend(["－", "－", "－"])
    fund_total.extend([f"{us_stock:,}円", f"{os_reit:,}円", f"{os_bond:,}円"])

    funds_df = pd.DataFrame({
        "ファンド名": fund_names,
        "通常（15日自動）": fund_regular,
        "追加（14日手動）": fund_additional,
        "合計": fund_total
    })

    st.dataframe(funds_df, use_container_width=True, hide_index=True)

    st.markdown(f"""
    ### 📊 資産クラス別合計
    - 日本資産: {jp_total:,}円（30%）
    - 海外資産: {os_total:,}円（70%）
    - **合計**: {base_amount:,}円
    """)

elif jp_crash and not us_crash:
    # パターン2: 日本のみ暴落
    pattern = "pattern2"
    st.error("🚨 **日本市場のみ暴落！日本資産に追加投資**")

    st.markdown("""
    ### 📝 14日の作業（所要時間: 5分）
    SBI証券にログインして、以下の金額で買付を実行してください。
    """)

    # 日本資産の追加投資金額を計算
    jp_stock_add = round_to_1000(crash_fund_jp * FUND_RATIOS["jp_stock"] / JP_RATIO)
    jp_reit_add = round_to_1000(crash_fund_jp * FUND_RATIOS["jp_reit"] / JP_RATIO)
    jp_bond_add = round_to_1000(crash_fund_jp * FUND_RATIOS["jp_bond"] / JP_RATIO)

    # 銘柄別買付金額表
    fund_names = [
        "eMAXIS Slim 国内株式（TOPIX）",
        "eMAXIS Slim 国内リートインデックス",
        "eMAXIS Slim 国内債券インデックス",
    ]
    fund_regular = [f"{jp_stock:,}円", f"{jp_reit:,}円", f"{jp_bond:,}円"]
    fund_additional = [f"✅ +{jp_stock_add:,}円", f"✅ +{jp_reit_add:,}円", f"✅ +{jp_bond_add:,}円"]
    fund_total = [f"{jp_stock + jp_stock_add:,}円", f"{jp_reit + jp_reit_add:,}円", f"{jp_bond + jp_bond_add:,}円"]

    # グローバル株式の処理
    if global_stock_growth > 0:
        fund_names.extend([
            "eMAXIS Slim 全世界株式【つみたて投資枠】",
            "eMAXIS Slim 全世界株式【成長投資枠】"
        ])
        fund_regular.extend([f"{global_stock_tsumitate:,}円", f"{global_stock_growth:,}円"])
        fund_additional.extend(["－", "－"])
        fund_total.extend([f"{global_stock_tsumitate:,}円", f"{global_stock_growth:,}円"])
    else:
        fund_names.append("eMAXIS Slim 全世界株式（除く日本）")
        fund_regular.append(f"{global_stock_total:,}円")
        fund_additional.append("－")
        fund_total.append(f"{global_stock_total:,}円")

    # 残りのファンド
    fund_names.extend([
        "eMAXIS Slim 米国株式（S&P500）",
        "eMAXIS Slim 先進国リートインデックス",
        "eMAXIS Slim 先進国債券インデックス"
    ])
    fund_regular.extend([f"{us_stock:,}円", f"{os_reit:,}円", f"{os_bond:,}円"])
    fund_additional.extend(["－", "－", "－"])
    fund_total.extend([f"{us_stock:,}円", f"{os_reit:,}円", f"{os_bond:,}円"])

    funds_df = pd.DataFrame({
        "ファンド名": fund_names,
        "通常（15日自動）": fund_regular,
        "追加（14日手動）": fund_additional,
        "合計": fund_total
    })

    st.dataframe(funds_df, use_container_width=True, hide_index=True)

    jp_total_with_crash = jp_total + crash_fund_jp
    total_with_crash = base_amount + crash_fund_jp

    st.markdown(f"""
    ### 💰 資産クラス別合計

    | 資産クラス | 自動（15日） | 手動（14日） | 合計 |
    |-----------|------------|------------|------|
    | 日本資産 | {jp_total:,}円 | **+{crash_fund_jp:,}円** | **{jp_total_with_crash:,}円** |
    | 海外資産 | {os_total:,}円 | － | {os_total:,}円 |
    | **合計** | {base_amount:,}円 | {crash_fund_jp:,}円 | **{total_with_crash:,}円** |

    **ポイント**: 日本市場が割安なので、暴落用資金（日本分{crash_fund_jp:,}円）を追加投資！30:70の比率を維持。
    """)

elif not jp_crash and us_crash:
    # パターン3: 米国のみ暴落
    pattern = "pattern3"
    st.error("🚨 **米国（世界）市場のみ暴落！海外資産に追加投資**")

    st.markdown("""
    ### 📝 14日の作業（所要時間: 7分）
    SBI証券にログインして、以下の金額で買付を実行してください。
    """)

    # 海外資産の追加投資金額を計算
    global_stock_add = round_to_1000(crash_fund_os * FUND_RATIOS["global_stock"] / OS_RATIO)
    us_stock_add = round_to_1000(crash_fund_os * FUND_RATIOS["us_stock"] / OS_RATIO)
    os_reit_add = round_to_1000(crash_fund_os * FUND_RATIOS["os_reit"] / OS_RATIO)
    os_bond_add = round_to_1000(crash_fund_os * FUND_RATIOS["os_bond"] / OS_RATIO)

    # グローバル株式の追加投資をつみたて/成長枠に分割
    if global_stock_growth > 0:
        # 既に分割されている場合、比率を維持して分割
        global_tsumitate_ratio = global_stock_tsumitate / global_stock_total
        global_stock_add_tsumitate = round_to_1000(global_stock_add * global_tsumitate_ratio)
        global_stock_add_growth = global_stock_add - global_stock_add_tsumitate
    else:
        # 追加投資でつみたて枠を超える場合
        if global_stock_total + global_stock_add <= TSUMITATE_LIMIT:
            global_stock_add_tsumitate = global_stock_add
            global_stock_add_growth = 0
        else:
            available_tsumitate = TSUMITATE_LIMIT - global_stock_tsumitate
            global_stock_add_tsumitate = min(global_stock_add, available_tsumitate)
            global_stock_add_growth = global_stock_add - global_stock_add_tsumitate

    # 銘柄別買付金額表
    fund_names = [
        "eMAXIS Slim 国内株式（TOPIX）",
        "eMAXIS Slim 国内リートインデックス",
        "eMAXIS Slim 国内債券インデックス",
    ]
    fund_regular = [f"{jp_stock:,}円", f"{jp_reit:,}円", f"{jp_bond:,}円"]
    fund_additional = ["－", "－", "－"]
    fund_total = [f"{jp_stock:,}円", f"{jp_reit:,}円", f"{jp_bond:,}円"]

    # グローバル株式の処理
    if global_stock_growth > 0 or global_stock_add_growth > 0:
        fund_names.extend([
            "eMAXIS Slim 全世界株式【つみたて投資枠】",
            "eMAXIS Slim 全世界株式【成長投資枠】"
        ])
        fund_regular.extend([f"{global_stock_tsumitate:,}円", f"{global_stock_growth:,}円"])
        fund_additional.extend([f"✅ +{global_stock_add_tsumitate:,}円" if global_stock_add_tsumitate > 0 else "－",
                               f"✅ +{global_stock_add_growth:,}円" if global_stock_add_growth > 0 else "－"])
        fund_total.extend([f"{global_stock_tsumitate + global_stock_add_tsumitate:,}円",
                          f"{global_stock_growth + global_stock_add_growth:,}円"])
    else:
        fund_names.append("eMAXIS Slim 全世界株式（除く日本）")
        fund_regular.append(f"{global_stock_total:,}円")
        fund_additional.append(f"✅ +{global_stock_add:,}円")
        fund_total.append(f"{global_stock_total + global_stock_add:,}円")

    # 残りのファンド
    fund_names.extend([
        "eMAXIS Slim 米国株式（S&P500）",
        "eMAXIS Slim 先進国リートインデックス",
        "eMAXIS Slim 先進国債券インデックス"
    ])
    fund_regular.extend([f"{us_stock:,}円", f"{os_reit:,}円", f"{os_bond:,}円"])
    fund_additional.extend([f"✅ +{us_stock_add:,}円", f"✅ +{os_reit_add:,}円", f"✅ +{os_bond_add:,}円"])
    fund_total.extend([f"{us_stock + us_stock_add:,}円", f"{os_reit + os_reit_add:,}円", f"{os_bond + os_bond_add:,}円"])

    funds_df = pd.DataFrame({
        "ファンド名": fund_names,
        "通常（15日自動）": fund_regular,
        "追加（14日手動）": fund_additional,
        "合計": fund_total
    })

    st.dataframe(funds_df, use_container_width=True, hide_index=True)

    os_total_with_crash = os_total + crash_fund_os
    total_with_crash = base_amount + crash_fund_os

    st.markdown(f"""
    ### 💰 資産クラス別合計

    | 資産クラス | 自動（15日） | 手動（14日） | 合計 |
    |-----------|------------|------------|------|
    | 日本資産 | {jp_total:,}円 | － | {jp_total:,}円 |
    | 海外資産 | {os_total:,}円 | **+{crash_fund_os:,}円** | **{os_total_with_crash:,}円** |
    | **合計** | {base_amount:,}円 | {crash_fund_os:,}円 | **{total_with_crash:,}円** |

    **ポイント**: 米国・世界市場が割安なので、暴落用資金（海外分{crash_fund_os:,}円）を追加投資！30:70の比率を維持。
    """)

else:
    # パターン4: 両方暴落
    pattern = "pattern4"
    st.error("🚨🚨 **日米両市場とも暴落！全資産に追加投資**")

    st.markdown("""
    ### 📝 14日の作業（所要時間: 10分）
    SBI証券にログインして、以下の金額で買付を実行してください。
    """)

    # 日本資産の追加投資金額を計算
    jp_stock_add = round_to_1000(crash_fund_jp * FUND_RATIOS["jp_stock"] / JP_RATIO)
    jp_reit_add = round_to_1000(crash_fund_jp * FUND_RATIOS["jp_reit"] / JP_RATIO)
    jp_bond_add = round_to_1000(crash_fund_jp * FUND_RATIOS["jp_bond"] / JP_RATIO)

    # 海外資産の追加投資金額を計算
    global_stock_add = round_to_1000(crash_fund_os * FUND_RATIOS["global_stock"] / OS_RATIO)
    us_stock_add = round_to_1000(crash_fund_os * FUND_RATIOS["us_stock"] / OS_RATIO)
    os_reit_add = round_to_1000(crash_fund_os * FUND_RATIOS["os_reit"] / OS_RATIO)
    os_bond_add = round_to_1000(crash_fund_os * FUND_RATIOS["os_bond"] / OS_RATIO)

    # グローバル株式の追加投資をつみたて/成長枠に分割
    if global_stock_growth > 0:
        # 既に分割されている場合、比率を維持して分割
        global_tsumitate_ratio = global_stock_tsumitate / global_stock_total
        global_stock_add_tsumitate = round_to_1000(global_stock_add * global_tsumitate_ratio)
        global_stock_add_growth = global_stock_add - global_stock_add_tsumitate
    else:
        # 追加投資でつみたて枠を超える場合
        if global_stock_total + global_stock_add <= TSUMITATE_LIMIT:
            global_stock_add_tsumitate = global_stock_add
            global_stock_add_growth = 0
        else:
            available_tsumitate = TSUMITATE_LIMIT - global_stock_tsumitate
            global_stock_add_tsumitate = min(global_stock_add, available_tsumitate)
            global_stock_add_growth = global_stock_add - global_stock_add_tsumitate

    # 銘柄別買付金額表
    fund_names = [
        "eMAXIS Slim 国内株式（TOPIX）",
        "eMAXIS Slim 国内リートインデックス",
        "eMAXIS Slim 国内債券インデックス",
    ]
    fund_regular = [f"{jp_stock:,}円", f"{jp_reit:,}円", f"{jp_bond:,}円"]
    fund_additional = [f"✅ +{jp_stock_add:,}円", f"✅ +{jp_reit_add:,}円", f"✅ +{jp_bond_add:,}円"]
    fund_total = [f"{jp_stock + jp_stock_add:,}円", f"{jp_reit + jp_reit_add:,}円", f"{jp_bond + jp_bond_add:,}円"]

    # グローバル株式の処理
    if global_stock_growth > 0 or global_stock_add_growth > 0:
        fund_names.extend([
            "eMAXIS Slim 全世界株式【つみたて投資枠】",
            "eMAXIS Slim 全世界株式【成長投資枠】"
        ])
        fund_regular.extend([f"{global_stock_tsumitate:,}円", f"{global_stock_growth:,}円"])
        fund_additional.extend([f"✅ +{global_stock_add_tsumitate:,}円" if global_stock_add_tsumitate > 0 else "－",
                               f"✅ +{global_stock_add_growth:,}円" if global_stock_add_growth > 0 else "－"])
        fund_total.extend([f"{global_stock_tsumitate + global_stock_add_tsumitate:,}円",
                          f"{global_stock_growth + global_stock_add_growth:,}円"])
    else:
        fund_names.append("eMAXIS Slim 全世界株式（除く日本）")
        fund_regular.append(f"{global_stock_total:,}円")
        fund_additional.append(f"✅ +{global_stock_add:,}円")
        fund_total.append(f"{global_stock_total + global_stock_add:,}円")

    # 残りのファンド
    fund_names.extend([
        "eMAXIS Slim 米国株式（S&P500）",
        "eMAXIS Slim 先進国リートインデックス",
        "eMAXIS Slim 先進国債券インデックス"
    ])
    fund_regular.extend([f"{us_stock:,}円", f"{os_reit:,}円", f"{os_bond:,}円"])
    fund_additional.extend([f"✅ +{us_stock_add:,}円", f"✅ +{os_reit_add:,}円", f"✅ +{os_bond_add:,}円"])
    fund_total.extend([f"{us_stock + us_stock_add:,}円", f"{os_reit + os_reit_add:,}円", f"{os_bond + os_bond_add:,}円"])

    funds_df = pd.DataFrame({
        "ファンド名": fund_names,
        "通常（15日自動）": fund_regular,
        "追加（14日手動）": fund_additional,
        "合計": fund_total
    })

    st.dataframe(funds_df, use_container_width=True, hide_index=True)

    jp_total_with_crash = jp_total + crash_fund_jp
    os_total_with_crash = os_total + crash_fund_os
    total_with_crash = base_amount + base_amount

    st.markdown(f"""
    ### 💰 資産クラス別合計

    | 資産クラス | 自動（15日） | 手動（14日） | 合計 |
    |-----------|------------|------------|------|
    | 日本資産 | {jp_total:,}円 | **+{crash_fund_jp:,}円** | **{jp_total_with_crash:,}円** |
    | 海外資産 | {os_total:,}円 | **+{crash_fund_os:,}円** | **{os_total_with_crash:,}円** |
    | **合計** | {base_amount:,}円 | {base_amount:,}円 | **{total_with_crash:,}円** |

    **ポイント**: 日米両市場が割安！全資産に通常配分で追加投資！
    """)

st.markdown("---")

# ===== 詳細データ表示 =====
st.subheader("📋 判定詳細データ")

# 日本市場
st.markdown("**🇯🇵 日本市場**")
jp_conditions_df = pd.DataFrame({
    "条件": ["VIX > 30", "日本バフェット < 80%", "日経平均 ≤ -20%"],
    "結果": [
        "✅ 該当" if vix_condition else "❌ 非該当",
        "✅ 該当" if buffett_jp_condition else "❌ 非該当",
        "✅ 該当" if nikkei_condition else "❌ 非該当"
    ],
    "値": [
        f"{vix_value:.2f}" if vix_value is not None else "N/A",
        f"{buffett_jp:.1f}%",
        f"{nikkei_change:+.2f}%" if nikkei_change is not None else "N/A"
    ]
})
st.dataframe(jp_conditions_df, use_container_width=True)

# 米国市場
st.markdown("**🇺🇸 米国市場**")
us_conditions_df = pd.DataFrame({
    "条件": ["VIX > 30", "米国バフェット < 80%", "S&P500 ≤ -20%"],
    "結果": [
        "✅ 該当" if vix_condition else "❌ 非該当",
        "✅ 該当" if buffett_us_condition else "❌ 非該当",
        "✅ 該当" if sp500_condition else "❌ 非該当"
    ],
    "値": [
        f"{vix_value:.2f}" if vix_value is not None else "N/A",
        f"{buffett_us:.1f}%",
        f"{sp500_change:+.2f}%" if sp500_change is not None else "N/A"
    ]
})
st.dataframe(us_conditions_df, use_container_width=True)

st.markdown("---")

# ===== リバランス計算機 =====
st.subheader("⚖️ ポートフォリオ・リバランス計算機")

st.markdown("""
片方の市場のみ暴落した場合、30:70のバランスが崩れます。
各ファンドの現在残高を入力して、理想比率に戻すための調整額を計算できます。
""")

# 銘柄別残高入力
st.markdown("### 📊 現在の保有残高（銘柄別）")

col_jp_funds, col_os_funds = st.columns(2)

with col_jp_funds:
    st.markdown("**🇯🇵 日本資産**")

    current_jp_stock = st.number_input(
        "国内株式（TOPIX）",
        min_value=0,
        max_value=100000000,
        value=0,
        step=1000,
        key="rebal_jp_stock"
    )

    current_jp_reit = st.number_input(
        "国内REIT",
        min_value=0,
        max_value=100000000,
        value=0,
        step=1000,
        key="rebal_jp_reit"
    )

    current_jp_bond = st.number_input(
        "国内債券",
        min_value=0,
        max_value=100000000,
        value=0,
        step=1000,
        key="rebal_jp_bond"
    )

with col_os_funds:
    st.markdown("**🇺🇸 海外資産**")

    current_global_stock = st.number_input(
        "全世界株式（除く日本）",
        min_value=0,
        max_value=100000000,
        value=0,
        step=1000,
        key="rebal_global"
    )

    current_us_stock = st.number_input(
        "米国株式（S&P500）",
        min_value=0,
        max_value=100000000,
        value=0,
        step=1000,
        key="rebal_us"
    )

    current_os_reit = st.number_input(
        "先進国REIT",
        min_value=0,
        max_value=100000000,
        value=0,
        step=1000,
        key="rebal_os_reit"
    )

    current_os_bond = st.number_input(
        "先進国債券",
        min_value=0,
        max_value=100000000,
        value=0,
        step=1000,
        key="rebal_os_bond"
    )

# 合計を計算
current_jp = current_jp_stock + current_jp_reit + current_jp_bond
current_os = current_global_stock + current_us_stock + current_os_reit + current_os_bond

# 計算実行
if current_jp > 0 or current_os > 0:
    total_current = current_jp + current_os

    if total_current > 0:
        # 現在の比率
        current_jp_ratio = (current_jp / total_current) * 100
        current_os_ratio = (current_os / total_current) * 100

        # 目標額（30:70比率）
        target_jp = round_to_1000(total_current * JP_RATIO)
        target_os = round_to_1000(total_current * OS_RATIO)

        # 調整必要額
        adjust_jp = target_jp - current_jp
        adjust_os = target_os - current_os

        st.markdown("---")

        # 現状分析
        col1, col2, col3 = st.columns(3)

        with col1:
            st.metric(
                "現在の総資産",
                f"{total_current:,}円"
            )

        with col2:
            st.metric(
                "日本資産比率",
                f"{current_jp_ratio:.1f}%",
                f"{current_jp_ratio - 30:.1f}%",
                delta_color="inverse"
            )

        with col3:
            st.metric(
                "海外資産比率",
                f"{current_os_ratio:.1f}%",
                f"{current_os_ratio - 70:.1f}%",
                delta_color="inverse"
            )

        # 目標金額（各ファンド）
        target_jp_stock = round_to_1000(total_current * FUND_RATIOS["jp_stock"])
        target_jp_reit = round_to_1000(total_current * FUND_RATIOS["jp_reit"])
        target_jp_bond = round_to_1000(total_current * FUND_RATIOS["jp_bond"])
        target_global_stock = round_to_1000(total_current * FUND_RATIOS["global_stock"])
        target_us_stock = round_to_1000(total_current * FUND_RATIOS["us_stock"])
        target_os_reit = round_to_1000(total_current * FUND_RATIOS["os_reit"])
        target_os_bond = round_to_1000(total_current * FUND_RATIOS["os_bond"])

        # 各ファンドの調整額
        adjust_jp_stock = target_jp_stock - current_jp_stock
        adjust_jp_reit = target_jp_reit - current_jp_reit
        adjust_jp_bond = target_jp_bond - current_jp_bond
        adjust_global_stock = target_global_stock - current_global_stock
        adjust_us_stock = target_us_stock - current_us_stock
        adjust_os_reit = target_os_reit - current_os_reit
        adjust_os_bond = target_os_bond - current_os_bond

        # リバランス提案
        st.markdown("### 📊 リバランス提案（銘柄別）")

        # 全体のバランス判定
        if abs(adjust_jp) < 10000 and abs(adjust_os) < 10000:
            st.success("✅ **バランス良好！** 全体の調整は不要です（誤差1万円未満）")
        else:
            if adjust_jp > 0:
                st.warning(f"⚠️ **日本資産が不足** - {abs(adjust_jp):,}円の追加購入を推奨")
            elif adjust_jp < 0:
                st.info(f"ℹ️ 日本資産が{abs(adjust_jp):,}円過剰 - 次回投資で海外資産を優先")

            if adjust_os > 0:
                st.warning(f"⚠️ **海外資産が不足** - {abs(adjust_os):,}円の追加購入を推奨")
            elif adjust_os < 0:
                st.info(f"ℹ️ 海外資産が{abs(adjust_os):,}円過剰 - 次回投資で日本資産を優先")

        st.markdown("---")

        # 銘柄別の詳細表示
        col_jp_rebal, col_os_rebal = st.columns(2)

        with col_jp_rebal:
            st.markdown("**🇯🇵 日本資産の調整**")

            jp_rebal_df = pd.DataFrame({
                "ファンド": ["国内株式", "国内REIT", "国内債券"],
                "現在": [f"{current_jp_stock:,}円", f"{current_jp_reit:,}円", f"{current_jp_bond:,}円"],
                "目標": [f"{target_jp_stock:,}円", f"{target_jp_reit:,}円", f"{target_jp_bond:,}円"],
                "調整": [
                    f"{adjust_jp_stock:+,}円" if abs(adjust_jp_stock) >= 1000 else "±0円",
                    f"{adjust_jp_reit:+,}円" if abs(adjust_jp_reit) >= 1000 else "±0円",
                    f"{adjust_jp_bond:+,}円" if abs(adjust_jp_bond) >= 1000 else "±0円"
                ]
            })
            st.dataframe(jp_rebal_df, use_container_width=True, hide_index=True)

        with col_os_rebal:
            st.markdown("**🇺🇸 海外資産の調整**")

            os_rebal_df = pd.DataFrame({
                "ファンド": ["全世界株式", "米国株式", "先進国REIT", "先進国債券"],
                "現在": [
                    f"{current_global_stock:,}円",
                    f"{current_us_stock:,}円",
                    f"{current_os_reit:,}円",
                    f"{current_os_bond:,}円"
                ],
                "目標": [
                    f"{target_global_stock:,}円",
                    f"{target_us_stock:,}円",
                    f"{target_os_reit:,}円",
                    f"{target_os_bond:,}円"
                ],
                "調整": [
                    f"{adjust_global_stock:+,}円" if abs(adjust_global_stock) >= 1000 else "±0円",
                    f"{adjust_us_stock:+,}円" if abs(adjust_us_stock) >= 1000 else "±0円",
                    f"{adjust_os_reit:+,}円" if abs(adjust_os_reit) >= 1000 else "±0円",
                    f"{adjust_os_bond:+,}円" if abs(adjust_os_bond) >= 1000 else "±0円"
                ]
            })
            st.dataframe(os_rebal_df, use_container_width=True, hide_index=True)

        # 追加購入が必要なファンドのみリスト表示
        st.markdown("### 💰 追加購入が必要なファンド")

        buy_needed = []

        if adjust_jp_stock >= 1000:
            buy_needed.append(("eMAXIS Slim 国内株式（TOPIX）", adjust_jp_stock))
        if adjust_jp_reit >= 1000:
            buy_needed.append(("eMAXIS Slim 国内リートインデックス", adjust_jp_reit))
        if adjust_jp_bond >= 1000:
            buy_needed.append(("eMAXIS Slim 国内債券インデックス", adjust_jp_bond))
        if adjust_global_stock >= 1000:
            buy_needed.append(("eMAXIS Slim 全世界株式（除く日本）", adjust_global_stock))
        if adjust_us_stock >= 1000:
            buy_needed.append(("eMAXIS Slim 米国株式（S&P500）", adjust_us_stock))
        if adjust_os_reit >= 1000:
            buy_needed.append(("eMAXIS Slim 先進国リートインデックス", adjust_os_reit))
        if adjust_os_bond >= 1000:
            buy_needed.append(("eMAXIS Slim 先進国債券インデックス", adjust_os_bond))

        if buy_needed:
            buy_df = pd.DataFrame(buy_needed, columns=["ファンド名", "追加購入額"])
            buy_df["追加購入額"] = buy_df["追加購入額"].apply(lambda x: f"{x:,}円")
            st.dataframe(buy_df, use_container_width=True, hide_index=True)

            total_buy = sum([amount for _, amount in buy_needed])
            st.info(f"**合計追加購入額**: {total_buy:,}円")
        else:
            st.success("✅ 追加購入が必要なファンドはありません")

        # リバランスを反映した次回投資額
        st.markdown("---")
        st.markdown("### 🎯 リバランスを考慮した次回投資プラン")

        st.markdown("""
        現在の残高バランスを考慮して、次回の月次投資額を調整できます。
        不足しているファンドに重点的に投資し、徐々にバランスを整えます。
        """)

        # リバランス戦略の選択
        rebalance_mode = st.radio(
            "リバランス戦略を選択してください",
            ["月次投資額の範囲内で調整", "追加資金でリバランス"],
            help="「月次投資額の範囲内」は数ヶ月かけて調整、「追加資金」は一度に不足を解消します。"
        )

        if rebalance_mode == "月次投資額の範囲内で調整":
            st.info("""
            📊 **月次投資額の範囲内で調整**

            通常の月次投資額（{:,}円）の範囲内で、不足ファンドに重点配分します。
            数ヶ月かけて徐々にバランスを整える方法です。
            """.format(base_amount))

            st.warning("""
            ⚠️ **重要な運用手順**

            この調整後の金額は**推奨継続期間**継続適用します：

            1. **証券会社で設定変更**: 調整後の金額を設定
            2. **推奨期間継続**: 表示された期間、毎月15日に自動買付
            3. **通常の金額に戻す**: 期間終了後、通常の月次投資額に戻す

            💡 **推奨**: カレンダーに「○ヶ月後に設定を戻す」リマインダーを設定
            """)

            # 最低購入金額の設定
            min_purchase = st.number_input(
                "各ファンドの最低購入金額（円）",
                min_value=1000,
                max_value=50000,
                value=3000,
                step=1000,
                help="全てのファンドで最低限購入する金額。分散投資を維持するため、0円にはなりません。"
            )

        else:  # 追加資金でリバランス
            st.info("""
            💰 **追加資金でリバランス**

            通常の月次投資額に加えて、追加資金を投入することで、
            **次回1回の買付で**バランスを大きく改善します。
            """)

            st.warning("""
            ⚠️ **重要な運用手順**

            追加資金は**次回1回だけ**に適用します：

            1. **証券会社で設定変更**: 次回買付のみ、調整後の金額を設定
            2. **買付完了を待つ**: 15日の自動買付が完了するのを確認
            3. **通常の金額に戻す**: 買付完了後、すぐに通常の月次投資額に戻す

            ⚠️ **戻し忘れると**: 継続的に偏った投資になります！

            💡 **推奨**: カレンダーに「買付完了後に設定を戻す」リマインダーを設定
            """)

            # 追加投資額の入力
            additional_amount = st.number_input(
                "追加投資額（円）",
                min_value=0,
                max_value=10000000,
                value=100000,
                step=10000,
                help="通常の月次投資額に追加して投入する金額。不足ファンドに優先配分されます。"
            )

            # 最低購入金額の設定
            min_purchase = st.number_input(
                "各ファンドの最低購入金額（円）",
                min_value=1000,
                max_value=50000,
                value=3000,
                step=1000,
                help="全てのファンドで最低限購入する金額。分散投資を維持するため、0円にはなりません。"
            )

        # 次回投資額を計算
        # 不足しているファンドのリストアップ
        shortage_funds = []
        if adjust_jp_stock > 0:
            shortage_funds.append(("jp_stock", adjust_jp_stock))
        if adjust_jp_reit > 0:
            shortage_funds.append(("jp_reit", adjust_jp_reit))
        if adjust_jp_bond > 0:
            shortage_funds.append(("jp_bond", adjust_jp_bond))
        if adjust_global_stock > 0:
            shortage_funds.append(("global_stock", adjust_global_stock))
        if adjust_us_stock > 0:
            shortage_funds.append(("us_stock", adjust_us_stock))
        if adjust_os_reit > 0:
            shortage_funds.append(("os_reit", adjust_os_reit))
        if adjust_os_bond > 0:
            shortage_funds.append(("os_bond", adjust_os_bond))

        if shortage_funds:
            # 不足額の合計
            total_shortage = sum([amount for _, amount in shortage_funds])

            if rebalance_mode == "月次投資額の範囲内で調整":
                # モード1: 月次投資額の範囲内で調整
                # ベース金額から最低購入金額×7を引いた配分可能額
                min_total = min_purchase * 7
                if base_amount > min_total:
                    allocatable = base_amount - min_total

                    # 各ファンドの次回投資額を計算
                    next_jp_stock = min_purchase
                    next_jp_reit = min_purchase
                    next_jp_bond = min_purchase
                    next_global_stock = min_purchase
                    next_us_stock = min_purchase
                    next_os_reit = min_purchase
                    next_os_bond = min_purchase

                    # 不足しているファンドに配分可能額を振り分け
                    for fund_name, shortage in shortage_funds:
                        # 不足額の比率に応じて配分
                        ratio = shortage / total_shortage
                        additional = round_to_1000(allocatable * ratio)

                        if fund_name == "jp_stock":
                            next_jp_stock += additional
                        elif fund_name == "jp_reit":
                            next_jp_reit += additional
                        elif fund_name == "jp_bond":
                            next_jp_bond += additional
                        elif fund_name == "global_stock":
                            next_global_stock += additional
                        elif fund_name == "us_stock":
                            next_us_stock += additional
                        elif fund_name == "os_reit":
                            next_os_reit += additional
                        elif fund_name == "os_bond":
                            next_os_bond += additional

                    # 端数調整（合計がbase_amountになるように）
                    calculated_total = (next_jp_stock + next_jp_reit + next_jp_bond +
                                       next_global_stock + next_us_stock + next_os_reit + next_os_bond)
                    diff = base_amount - calculated_total

                    # 最も不足しているファンドに端数を追加
                    if diff != 0 and shortage_funds:
                        largest_shortage_fund = max(shortage_funds, key=lambda x: x[1])[0]
                        if largest_shortage_fund == "jp_stock":
                            next_jp_stock += diff
                        elif largest_shortage_fund == "jp_reit":
                            next_jp_reit += diff
                        elif largest_shortage_fund == "jp_bond":
                            next_jp_bond += diff
                        elif largest_shortage_fund == "global_stock":
                            next_global_stock += diff
                        elif largest_shortage_fund == "us_stock":
                            next_us_stock += diff
                        elif largest_shortage_fund == "os_reit":
                            next_os_reit += diff
                        elif largest_shortage_fund == "os_bond":
                            next_os_bond += diff

                    total_investment = base_amount

                else:
                    st.warning(f"⚠️ ベース金額（{base_amount:,}円）が最低購入金額の合計（{min_total:,}円）より小さいため、調整できません。")
                    st.stop()

            else:  # 追加資金でリバランス
                # モード2: 追加資金でリバランス
                # 通常の月次投資額は通常通り配分
                next_jp_stock = jp_stock
                next_jp_reit = jp_reit
                next_jp_bond = jp_bond
                next_global_stock = global_stock_total
                next_us_stock = us_stock
                next_os_reit = os_reit
                next_os_bond = os_bond

                # 追加資金を不足ファンドに比例配分
                for fund_name, shortage in shortage_funds:
                    # 不足額の比率に応じて追加資金を配分
                    ratio = shortage / total_shortage
                    additional = round_to_1000(additional_amount * ratio)

                    if fund_name == "jp_stock":
                        next_jp_stock += additional
                    elif fund_name == "jp_reit":
                        next_jp_reit += additional
                    elif fund_name == "jp_bond":
                        next_jp_bond += additional
                    elif fund_name == "global_stock":
                        next_global_stock += additional
                    elif fund_name == "us_stock":
                        next_us_stock += additional
                    elif fund_name == "os_reit":
                        next_os_reit += additional
                    elif fund_name == "os_bond":
                        next_os_bond += additional

                # 端数調整（合計がbase_amount + additional_amountになるように）
                calculated_total = (next_jp_stock + next_jp_reit + next_jp_bond +
                                   next_global_stock + next_us_stock + next_os_reit + next_os_bond)
                target_total = base_amount + additional_amount
                diff = target_total - calculated_total

                # 最も不足しているファンドに端数を追加
                if diff != 0 and shortage_funds:
                    largest_shortage_fund = max(shortage_funds, key=lambda x: x[1])[0]
                    if largest_shortage_fund == "jp_stock":
                        next_jp_stock += diff
                    elif largest_shortage_fund == "jp_reit":
                        next_jp_reit += diff
                    elif largest_shortage_fund == "jp_bond":
                        next_jp_bond += diff
                    elif largest_shortage_fund == "global_stock":
                        next_global_stock += diff
                    elif largest_shortage_fund == "us_stock":
                        next_us_stock += diff
                    elif largest_shortage_fund == "os_reit":
                        next_os_reit += diff
                    elif largest_shortage_fund == "os_bond":
                        next_os_bond += diff

                total_investment = target_total

            # 次回投資額の表示（両モード共通）
            col_next_jp, col_next_os = st.columns(2)

            with col_next_jp:
                st.markdown("**🇯🇵 日本資産**")
                next_jp_df = pd.DataFrame({
                    "ファンド": ["国内株式", "国内REIT", "国内債券"],
                    "通常配分": [f"{jp_stock:,}円", f"{jp_reit:,}円", f"{jp_bond:,}円"],
                    "調整後": [f"{next_jp_stock:,}円", f"{next_jp_reit:,}円", f"{next_jp_bond:,}円"],
                    "差分": [
                        f"{next_jp_stock - jp_stock:+,}円",
                        f"{next_jp_reit - jp_reit:+,}円",
                        f"{next_jp_bond - jp_bond:+,}円"
                    ]
                })
                st.dataframe(next_jp_df, use_container_width=True, hide_index=True)

            with col_next_os:
                st.markdown("**🇺🇸 海外資産**")
                next_os_df = pd.DataFrame({
                    "ファンド": ["全世界株式", "米国株式", "先進国REIT", "先進国債券"],
                    "通常配分": [f"{global_stock_total:,}円", f"{us_stock:,}円", f"{os_reit:,}円", f"{os_bond:,}円"],
                    "調整後": [
                        f"{next_global_stock:,}円",
                        f"{next_us_stock:,}円",
                        f"{next_os_reit:,}円",
                        f"{next_os_bond:,}円"
                    ],
                    "差分": [
                        f"{next_global_stock - global_stock_total:+,}円",
                        f"{next_us_stock - us_stock:+,}円",
                        f"{next_os_reit - os_reit:+,}円",
                        f"{next_os_bond - os_bond:+,}円"
                    ]
                })
                st.dataframe(next_os_df, use_container_width=True, hide_index=True)

            # サマリー
            next_jp_total = next_jp_stock + next_jp_reit + next_jp_bond
            next_os_total = next_global_stock + next_us_stock + next_os_reit + next_os_bond

            # 必要な継続期間を計算
            months_needed = []
            fund_details = []

            # 各不足ファンドの必要月数を計算
            if adjust_jp_stock > 0:
                additional = next_jp_stock - jp_stock
                if additional > 0:
                    months = int(adjust_jp_stock / additional) + (1 if adjust_jp_stock % additional > 0 else 0)
                    months_needed.append(months)
                    fund_details.append(f"国内株式: {months}ヶ月")

            if adjust_jp_reit > 0:
                additional = next_jp_reit - jp_reit
                if additional > 0:
                    months = int(adjust_jp_reit / additional) + (1 if adjust_jp_reit % additional > 0 else 0)
                    months_needed.append(months)
                    fund_details.append(f"国内REIT: {months}ヶ月")

            if adjust_jp_bond > 0:
                additional = next_jp_bond - jp_bond
                if additional > 0:
                    months = int(adjust_jp_bond / additional) + (1 if adjust_jp_bond % additional > 0 else 0)
                    months_needed.append(months)
                    fund_details.append(f"国内債券: {months}ヶ月")

            if adjust_global_stock > 0:
                additional = next_global_stock - global_stock_total
                if additional > 0:
                    months = int(adjust_global_stock / additional) + (1 if adjust_global_stock % additional > 0 else 0)
                    months_needed.append(months)
                    fund_details.append(f"全世界株式: {months}ヶ月")

            if adjust_us_stock > 0:
                additional = next_us_stock - us_stock
                if additional > 0:
                    months = int(adjust_us_stock / additional) + (1 if adjust_us_stock % additional > 0 else 0)
                    months_needed.append(months)
                    fund_details.append(f"米国株式: {months}ヶ月")

            if adjust_os_reit > 0:
                additional = next_os_reit - os_reit
                if additional > 0:
                    months = int(adjust_os_reit / additional) + (1 if adjust_os_reit % additional > 0 else 0)
                    months_needed.append(months)
                    fund_details.append(f"先進国REIT: {months}ヶ月")

            if adjust_os_bond > 0:
                additional = next_os_bond - os_bond
                if additional > 0:
                    months = int(adjust_os_bond / additional) + (1 if adjust_os_bond % additional > 0 else 0)
                    months_needed.append(months)
                    fund_details.append(f"先進国債券: {months}ヶ月")

            # 最大月数を取得
            max_months = max(months_needed) if months_needed else 0

            # モードに応じたサマリー表示
            if rebalance_mode == "月次投資額の範囲内で調整":
                st.info(f"""
                **📊 次回投資額サマリー:**
                - 日本資産: {next_jp_total:,}円
                - 海外資産: {next_os_total:,}円
                - 合計: {total_investment:,}円

                この配分で投資すると、{len(shortage_funds)}個の不足ファンドのバランスが徐々に改善されます。
                """)

                if max_months > 0:
                    st.success(f"""
                    ⏱️ **推奨継続期間: {max_months}ヶ月**

                    この調整後の金額で**約{max_months}ヶ月間**継続して買付することで、
                    全ての不足ファンドが目標バランスに到達します。

                    📅 **手順:**
                    1. 証券会社で調整後の金額に設定変更
                    2. {max_months}ヶ月間、毎月15日の自動買付を継続
                    3. {max_months}ヶ月後、通常の{base_amount:,}円に戻す
                    4. カレンダーに「{max_months}ヶ月後に設定を戻す」とリマインダー設定
                    """)

                    # 各ファンドの詳細を展開可能にする
                    with st.expander("📋 各ファンドの必要月数（詳細）"):
                        for detail in fund_details:
                            st.write(f"- {detail}")

            else:  # 追加資金でリバランス
                st.info(f"""
                **📊 次回投資額サマリー:**
                - 日本資産: {next_jp_total:,}円
                - 海外資産: {next_os_total:,}円
                - **合計: {total_investment:,}円** （通常 {base_amount:,}円 + 追加 {additional_amount:,}円）

                追加資金{additional_amount:,}円を不足ファンドに配分します。
                """)

                if max_months > 0:
                    if max_months == 1:
                        st.success(f"""
                        ✅ **次回1回の買付で完了**

                        この金額で買付することで、全ての不足ファンドのバランスが改善されます。

                        📅 **手順:**
                        1. 証券会社で次回買付のみ、{total_investment:,}円に設定変更
                        2. 15日の自動買付を確認
                        3. 買付完了後、すぐに通常の{base_amount:,}円に戻す
                        4. カレンダーに「買付完了後に設定を戻す」リマインダー設定
                        """)
                    else:
                        st.warning(f"""
                        ⚠️ **追加資金が不足しています**

                        現在の追加資金では、約{max_months}回の買付が必要です。

                        💡 **提案:**
                        - 追加資金を増やす（推奨: {total_shortage:,}円以上）
                        - または「月次投資額の範囲内で調整」モードを使用
                        """)

                # 各ファンドの詳細を展開可能にする
                with st.expander("📋 各ファンドへの配分詳細"):
                    for detail in fund_details:
                        st.write(f"- {detail}")
        else:
            st.success("✅ バランスが良好なため、通常の配分で投資してください。")

# ===== LINE通知セクション =====
st.markdown("---")
st.subheader("📱 LINE通知")

# LINE Notifyトークンが設定されているかチェック
if "line_notify_token" in st.secrets:
    st.info("✅ LINE Notifyが設定されています")

    if st.button("📤 判定結果をLINEに送信", type="primary"):
        # 判定結果メッセージを生成
        message = f"""
📊 Plan C 暴落判定結果
判定日: {today}

【市場状況】
VIX指数: {vix_value:.2f}
日本市場: {"🚨 暴落" if jp_crash else "✅ 通常"}
米国市場: {"🚨 暴落" if us_crash else "✅ 通常"}

【最終判定】
"""
        if not jp_crash and not us_crash:
            message += f"✅ 両市場とも通常\n追加投資: なし\n15日の自動買付: {base_amount:,}円"
        elif jp_crash and not us_crash:
            message += f"🚨 日本市場のみ暴落\n追加投資: 日本資産に+{crash_fund_jp:,}円\n合計: {base_amount + crash_fund_jp:,}円"
        elif not jp_crash and us_crash:
            message += f"🚨 米国市場のみ暴落\n追加投資: 海外資産に+{crash_fund_os:,}円\n合計: {base_amount + crash_fund_os:,}円"
        else:
            message += f"🚨 両市場とも暴落\n追加投資: 全資産に+{base_amount:,}円\n合計: {base_amount * 2:,}円"

        # LINE通知を送信
        with st.spinner("LINEに送信中..."):
            if send_line_notify(message):
                st.success("✅ LINEに送信しました！")
            else:
                st.error("❌ LINE送信に失敗しました")

else:
    st.warning("⚠️ LINE Notifyが設定されていません")
    st.markdown("""
    LINE通知を有効にするには：
    1. [LINE Notify](https://notify-bot.line.me/)でトークンを取得
    2. Streamlit Community Cloudの「Settings」→「Secrets」で設定
    3. `line_notify_token = "your_token_here"`を追加
    """)

# フッター
st.markdown("---")
st.caption("Plan C 投資戦略 - 月15日買付版（日米別判定） | 毎月14日に実施")

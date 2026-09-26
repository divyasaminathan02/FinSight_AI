from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel

class ExecutiveKPICard(BaseModel):
    id: str
    title: str
    value: str
    numeric_value: float
    unit: str
    change_pct: float
    change_direction: str  # up, down, neutral
    status: str  # positive, warning, negative, neutral
    subtext: str
    sparkline: Optional[List[float]] = None

class AgentCard(BaseModel):
    id: str
    name: str
    short_name: str
    status: str  # Monitoring, Elevated, Healthy, Improving, Warning, Critical
    status_type: str  # normal, elevated, positive, warning, critical
    key_metric_label: str
    key_metric_value: str
    secondary_metric_label: str
    secondary_metric_value: str
    trend: str
    trend_direction: str
    icon_name: str
    action_label: str = "View intelligence"
    route: str
    last_updated: str
    execution_time_ms: int

class AgentNetworkNode(BaseModel):
    id: str
    name: str
    role: str
    status: str  # active, synced, processing
    latency_ms: int
    data_out: str

class AgentNetworkStatusResponse(BaseModel):
    pipeline_state: str  # Operational, Synced, Active
    sync_rate: float  # e.g., 99.8%
    last_sync_timestamp: str
    nodes: List[AgentNetworkNode]
    pipeline_order: List[str]

class RiskTrendDataPoint(BaseModel):
    date: str
    month_label: str
    overall_risk_score: float
    credit_risk_score: float
    collection_risk_score: float
    npa_risk_score: Optional[float] = None

class RiskTrendResponse(BaseModel):
    timeframe: str
    trend_summary: str
    current_overall_score: float
    series: List[RiskTrendDataPoint]

class RiskAlertItem(BaseModel):
    id: str
    severity: str  # High, Medium, Low, Critical
    message: str
    timestamp: str
    responsible_agent: str
    category: str
    impact_metric: Optional[str] = None
    is_acknowledged: bool = False

class CollectionsPerformanceResponse(BaseModel):
    current_month_collected_cr: float
    current_month_collected_formatted: str  # "₹42.8 Cr"
    collection_efficiency_pct: float
    efficiency_target_pct: float
    expected_collections_cr: float
    actual_collections_cr: float
    at_risk_receivables_cr: float
    resolution_rate_pct: float
    breakdown_by_bucket: Dict[str, float]
    trend_direction: str

class LiquidityForecastResponse(BaseModel):
    timeframe: str  # "30-Day Forecast"
    forecast_status: str  # "Stable", "Adequate", "Surplus"
    current_liquidity_cr: float
    current_liquidity_formatted: str  # "₹126.4 Cr"
    expected_inflows_cr: float
    expected_outflows_cr: float
    forecasted_liquidity_cr: float
    liquidity_buffer_ratio: float
    stress_test_status: str
    projections: List[Dict[str, Any]]

class DashboardOverviewResponse(BaseModel):
    as_of: str
    portfolio_status: str
    kpis: List[ExecutiveKPICard]
    agents: List[AgentCard]
    network: AgentNetworkStatusResponse
    risk_trend: RiskTrendResponse
    risk_alerts: List[RiskAlertItem]
    collections: CollectionsPerformanceResponse
    liquidity: LiquidityForecastResponse

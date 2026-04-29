/**
 * pages/dashboard.js
 * CP5: Main dashboard page
 */

import React from 'react';
import Head from 'next/head';
import AgentDashboard from '../components/AgentDashboard';

export default function Dashboard() {
  return (
    <>
      <Head>
        <title>AgentVerify Dashboard - Real-time Agent Coordination</title>
        <meta name="description" content="Dashboard for AgentVerify - Trust Layer for AI Agents" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <AgentDashboard />
      </main>
    </>
  );
}
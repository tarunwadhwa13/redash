import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { react2angular } from "react2angular";

import EditInPlace from "@/components/EditInPlace";
import Parameters from "@/components/Parameters";
import TimeAgo from "@/components/TimeAgo";
import QueryControlDropdown from "@/components/EditVisualizationButton/QueryControlDropdown";
import EditVisualizationButton from "@/components/EditVisualizationButton";

import { DataSource } from "@/services/data-source";
import { pluralize, durationHumanize } from "@/lib/utils";

import QueryPageHeader from "./components/QueryPageHeader";
import QueryVisualizationTabs from "./components/QueryVisualizationTabs";
import QueryExecutionStatus from "./components/QueryExecutionStatus";
import QueryMetadata from "./components/QueryMetadata";
import QueryViewExecuteButton from "./components/QueryViewExecuteButton";

import useVisualizationTabHandler from "./hooks/useVisualizationTabHandler";
import useQueryExecute from "./hooks/useQueryExecute";
import useUpdateQueryDescription from "./hooks/useUpdateQueryDescription";
import useQueryFlags from "./hooks/useQueryFlags";
import useQueryParameters from "./hooks/useQueryParameters";
import useAddToDashboardDialog from "./hooks/useAddToDashboardDialog";
import useEmbedDialog from "./hooks/useEmbedDialog";
import useEditScheduleDialog from "./hooks/useEditScheduleDialog";
import useEditVisualizationDialog from "./hooks/useEditVisualizationDialog";
import useDeleteVisualization from "./hooks/useDeleteVisualization";

import "./QueryView.less";

function QueryView(props) {
  const [query, setQuery] = useState(props.query);
  const [dataSource, setDataSource] = useState();
  const queryFlags = useQueryFlags(query, dataSource);
  const [parameters, areParametersDirty, updateParametersDirtyFlag] = useQueryParameters(query);
  const [selectedVisualization, setSelectedVisualization] = useVisualizationTabHandler(query.visualizations);

  const {
    queryResult,
    queryResultData,
    isQueryExecuting,
    isExecutionCancelling,
    executeQuery,
    cancelExecution,
  } = useQueryExecute(query);

  const updateQueryDescription = useUpdateQueryDescription(query, setQuery);
  const openAddToDashboardDialog = useAddToDashboardDialog(query);
  const openEmbedDialog = useEmbedDialog(query);
  const editSchedule = useEditScheduleDialog(query, setQuery);
  const addVisualization = useEditVisualizationDialog(query, queryResult, (newQuery, visualization) => {
    setQuery(newQuery);
    setSelectedVisualization(visualization.id);
  });
  const editVisualization = useEditVisualizationDialog(query, queryResult, newQuery => setQuery(newQuery));
  const deleteVisualization = useDeleteVisualization(query, setQuery);

  const doExecuteQuery = useCallback(
    (skipParametersDirtyFlag = false) => {
      if (!queryFlags.canExecute || (!skipParametersDirtyFlag && areParametersDirty) || isQueryExecuting) {
        return;
      }
      executeQuery();
    },
    [areParametersDirty, executeQuery, isQueryExecuting, queryFlags.canExecute]
  );

  useEffect(() => {
    document.title = query.name;
  }, [query.name]);

  useEffect(() => {
    DataSource.get({ id: query.data_source_id }).$promise.then(setDataSource);
  }, [query.data_source_id]);

  return (
    <div className="query-page-wrapper">
      <div className="container">
        <QueryPageHeader
          query={query}
          dataSource={dataSource}
          onChange={setQuery}
          selectedVisualization={selectedVisualization}
          headerExtra={
            <QueryViewExecuteButton
              className="m-r-5"
              shortcut="mod+enter, alt+enter"
              disabled={!queryFlags.canExecute || isQueryExecuting || areParametersDirty}
              onClick={doExecuteQuery}>
              Refresh
            </QueryViewExecuteButton>
          }
        />
        <div className="m-t-5 m-l-15 m-r-15">
          <EditInPlace
            className="w-100"
            value={query.description}
            isEditable={queryFlags.canEdit}
            onDone={updateQueryDescription}
            placeholder="Add description"
            ignoreBlanks={false}
            editorProps={{ autosize: { minRows: 2, maxRows: 4 } }}
            multiline
          />
        </div>
      </div>
      <div className="query-view-content">
        <div className="query-results m-t-15">
          {query.hasParameters() && (
            <div className="bg-white tiled p-15 m-b-15">
              <Parameters
                parameters={parameters}
                onValuesChange={() => {
                  updateParametersDirtyFlag(false);
                  doExecuteQuery(true);
                }}
                onPendingValuesChange={() => updateParametersDirtyFlag()}
              />
            </div>
          )}
          {queryResult && queryResultData.status !== "done" && (
            <div className="query-alerts m-t-15 m-b-15">
              <QueryExecutionStatus
                status={queryResultData.status}
                updatedAt={queryResultData.updatedAt}
                error={queryResultData.error}
                isCancelling={isExecutionCancelling}
                onCancel={cancelExecution}
              />
            </div>
          )}
          {queryResultData.status === "done" && (
            <>
              <QueryVisualizationTabs
                queryResult={queryResult}
                visualizations={query.visualizations}
                showNewVisualizationButton={queryFlags.canEdit}
                canDeleteVisualizations={queryFlags.canEdit}
                selectedTab={selectedVisualization}
                onChangeTab={setSelectedVisualization}
                onAddVisualization={addVisualization}
                onDeleteVisualization={deleteVisualization}
                cardStyle
              />
              <div className="query-results-footer d-flex align-items-center">
                <span className="m-r-10">
                  <QueryControlDropdown
                    query={query}
                    queryResult={queryResult}
                    queryExecuting={isQueryExecuting}
                    showEmbedDialog={openEmbedDialog}
                    embed={false}
                    apiKey={query.api_key}
                    selectedTab={selectedVisualization}
                    openAddToDashboardForm={openAddToDashboardDialog}
                  />
                </span>
                {queryFlags.canEdit && (
                  <EditVisualizationButton
                    openVisualizationEditor={editVisualization}
                    selectedTab={selectedVisualization}
                  />
                )}
                <span className="m-l-5">
                  <strong>{queryResultData.rows.length}</strong> {pluralize("row", queryResultData.rows.length)}
                </span>
                <span className="m-l-10">
                  <strong>{durationHumanize(queryResult.getRuntime())}</strong>
                  <span className="hidden-xs"> runtime</span>
                </span>
                <span className="flex-fill" />
                <span className="m-r-10 hidden-xs">
                  Updated{" "}
                  <strong>
                    <TimeAgo date={queryResult.query_result.retrieved_at} />
                  </strong>
                </span>
              </div>
            </>
          )}
        </div>
        <div className="p-15">
          <QueryMetadata layout="horizontal" query={query} dataSource={dataSource} onEditSchedule={editSchedule} />
        </div>
      </div>
    </div>
  );
}

QueryView.propTypes = { query: PropTypes.object.isRequired }; // eslint-disable-line react/forbid-prop-types

export default function init(ngModule) {
  ngModule.component("pageQueryView", react2angular(QueryView));

  return {
    "/queries/:queryId": {
      template: '<page-query-view query="$resolve.query"></page-query-view>',
      reloadOnSearch: false,
      layout: "fixed",
      resolve: {
        query: (Query, $route) => {
          "ngInject";

          return Query.get({ id: $route.current.params.queryId }).$promise;
        },
      },
    },
  };
}

init.init = true;

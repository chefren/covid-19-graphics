(function($) {
  // Resize all graphs that need it
  var resizeGraphs = function() {
    $('.plotly-graph-needs-resize').each(function() {
      let id = this.id;
      requestAnimationFrame(function() {
        Plotly.relayout(id, {});        
      });
    });
  };

  // Toggle the side navigation
  var toggleSidebar = function(e) {
    $("body").toggleClass("sidebar-toggled");
    $(".sidebar").toggleClass("toggled");
    if ($(".sidebar").hasClass("toggled")) {
      $('.sidebar .collapse').collapse('hide');
    };
    resizeGraphs();
  };

  $(document).ready(function() {
    $("#sidebarToggleTop").on('click', toggleSidebar);

    if ($(document).width() < 768) {
      toggleSidebar();
    }

    $(window).resize(resizeGraphs);
  });
})(jQuery);


// log graphs with doubling lines
function plotly_log_graph_with_doubling_lines(id, traces, ymin, ymax) {
  var max_xval = 0;
  for (var i in traces) {
    max_xval = Math.max(traces[i].y.length - traces[i].x.indexOf(0) - 1, max_xval);
  }

  var graph_boty = Math.pow(10, ymin);
  var graph_topy = Math.pow(10, ymax);
  var graph_rangey = graph_topy - graph_boty;

  var annotations = [];
  var shapes = [];
  var days = [1,2,3,5,7,14];
  for (var i in days) {
    var d = days[i];
    var top_hit_x = Math.log2(graph_topy / graph_boty) * d;
    // assume the line hits the top of the graph, so we need our next relative to that point
    var x = top_hit_x;
    var y = graph_topy;
    var xanchor = 'middle';
    var yanchor = 'top';
    if (top_hit_x > max_xval) {
      // the line doesn't intersect the top of the graph (not exponential enough for the scale),
      // so it intersects the right side of the graph instead
      x = max_xval;
      y = 100 * Math.pow(2, max_xval / d);
      xanchor = 'right';
      yanchor = 'top';
    }
    annotations.push({
      text: (d == 1 ? "doubling every day" : "doubling every " + d + " days"),
      textangle: 0,
      x: x,
      y: Math.log10(y),
      xref: 'x',
      yref: 'y',
      showarrow: false,
      xanchor: xanchor,
      yanchor: yanchor,
      font: {
        color: '#aaaaaa',
        size: 10
      },
      bgcolor: '#ffffff'
    });
    shapes.push({
      x0: 0,
      x1: max_xval,
      type: 'line',
      y0: 100,
      y1: 100 * Math.pow(2, max_xval / d),
      xref: 'x',
      yref: 'y',
      line: {
        color: '#aaaaaa',
        dash: 'dot',
        width: 1
      }
    });
  }

  var p = Plotly.newPlot(
    id,
    traces,
    $.extend({}, default_layout, {yaxis: {type: "log", range: [ymin,ymax]}, xaxis: {rangemode: "nonnegative", autorange: true}, annotations: annotations, shapes: shapes}),
    $.extend({}, default_config)
  );
}

// now take the 'confirmed' graph and shift the x values.
function shift_graph_to_threshold(raw_traces) {
  var day0_threshold = 100;
  var adjusted_traces = [];
  for (var i in raw_traces) {
    var trace = raw_traces[i];
    var adjusted_trace = $.extend(true, {}, trace);
    var day0_index;
    for (var j in adjusted_trace.y) {
      if (adjusted_trace.y[j] >= day0_threshold) {
        day0_index = j;
        break;
      }
    }
    for (var j in adjusted_trace.x) {
      adjusted_trace.x[j] = j - day0_index;
    }
    adjusted_traces.push(adjusted_trace);
  }
  return adjusted_traces;
}

// makes all lines have lower opacity
function lower_opacity(traces, opacity) {
  for (var i in traces) {
    traces[i].opacity = opacity;
  }
  return traces;
}

function limit_to_biggest_series(traces, limit, visibility) {
  var ordered = traces.sort(function(a, b) {
    return b.y[b.y.length - 1] - a.y[a.y.length - 1];
  });

  for (var i in ordered) {
    if (i >= limit) {
      ordered[i]['visible'] = (visibility == null ? 'legendonly' : visibility);
    }
  }

  return ordered;
}

function combine_trace_data(trace_a, trace_b) {
  if (trace_a == null) return trace_b;
  if (trace_b == null) return trace_a;

  if (trace_a.x.indexOf(trace_b.x[0]) == -1) {
    // b starts before a, so swap
    var tmp = trace_a;
    trace_a = trace_b;
    trace_b = tmp;
  }

  // now we know that they overlap, and that 'a' starts before 'b'
  var start_of_b = trace_a.x.indexOf(trace_b.x[0]);

  for (var i = 0; i < trace_b.x.length; i++) {
    trace_a.x[start_of_b + i] = trace_b.x[i];
    if (start_of_b + i < trace_a.y.length) {
      trace_a.y[start_of_b + i] += trace_b.y[i];
    } else {
      trace_a.y[start_of_b + i] = trace_b.y[i];
    }
  }

  return trace_a;
}

// shows just the top N, and if there are more, groups the rest
function limit_to_biggest_series_group_rest(traces, limit) {
  if (traces.length <= limit) {
    return traces;
  }

  var ordered = traces.sort(function(a, b) {
    return b.y[b.y.length - 1] - a.y[a.y.length - 1];
  });

  var new_trace = null;
  for (var i in ordered) {
    if (i >= limit) {
      new_trace = combine_trace_data(new_trace, ordered[i]);
    }
  }

  new_trace.name = 'Other';

  var new_traces = ordered.slice(0, limit);
  new_traces.push(new_trace);

  return new_traces;
}

//
function plotly_log_graph_vs_top(id, skip_country_iso, main_line, top10_dataset, field) {
  // we want the confirmed and deaths for the country, plus the top 10 countries
  var lines_log = [];
  for (var country_iso in top10_dataset['subseries']) {
    if (country_iso == skip_country_iso) continue;
    lines_log.push(country_series_scaled(top10_dataset, top10_dataset['subseries'][country_iso], country_iso, scale_none, '')[field]);
  }

  lines_log = lower_opacity(limit_to_biggest_series(lines_log, 9, false), 0.3);
  
  lines_log.push($.extend({}, main_line, {line: {color: '#ff0000'}}));
  if (main_line.y[main_line.y.length - 1] > 100) {
    plotly_log_graph_with_doubling_lines(id, shift_graph_to_threshold(lines_log), 2, 7);
  } else {
    $('#'+id+'_row').remove();
  }
}
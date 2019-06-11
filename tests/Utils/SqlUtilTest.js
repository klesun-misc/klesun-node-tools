const SqlUtil = require("../../src/Utils/SqlUtil");

class SqlUtilTest extends require('../../src/Transpiled/Lib/TestCase.js') {
	provide_makeSelectQuery() {
		let testCases = [];

		testCases.push({
			"input": {
				"table": "cmd_rq_log",
				"where": [["agentId", "=", "2911"], ["requestId", "=", "0"]],
				"orderBy": "id DESC",
				"limit": 100
			},
			"output": {
				"sql": [
					"SELECT * FROM cmd_rq_log",
					"",
					"WHERE `agentId` = ? AND `requestId` = ?",
					"ORDER BY `id` DESC",
					"LIMIT 100"
				].join("\n"),
				"placedValues": ["2911", "0"]
			}
		});

		testCases.push({
			"input": {
				"table": "migrations",
				"where": [
					["name", "=", "GRECT/2019.04.17005-create-mentioned-pnrs-table"]
				]
			},
			"output": {
				"sql": "SELECT * FROM migrations\n\nWHERE `name` = ?",
				"placedValues": ["GRECT/2019.04.17005-create-mentioned-pnrs-table"]
			}
		});

		testCases.push({
			"input": {
				"table": "terminal_sessions",
				"as": "ts",
				"join": [],
				"where": [],
				"orderBy": "ts.id DESC",
				"limit": 2000
			},
			"output": {
				"sql": [
					"SELECT * FROM terminal_sessions AS ts",
					"",
					"ORDER BY `ts`.`id` DESC",
					"LIMIT 2000"
				].join("\n"),
				"placedValues": []
			}
		});

		testCases.push({
			"input": {
				"table": "terminal_sessions",
				"as": "ts",
				"join": [
					{
						"table": "mentioned_pnrs",
						"as": "mp",
						"on": [["mp.sessionId", "=", "ts.id"]]
					}
				],
				"where": [
					["ts.agent_id", "=", "6206"],
					["ts.gds", "=", "sabre"],
					["ts.id", "=", "15102"],
					["ts.lead_id", "=", "18544584"],
					["mp.recordLocator", "=", "TXH2HK"]
				],
				"orderBy": "ts.id DESC",
				"limit": 2000
			},
			"output": {
				"sql": [
					"SELECT * FROM terminal_sessions AS ts",
					"  JOIN mentioned_pnrs AS mp ON mp.sessionId = ts.id",
					"WHERE `ts`.`agent_id` = ? AND `ts`.`gds` = ? AND `ts`.`id` = ? AND `ts`.`lead_id` = ? AND `mp`.`recordLocator` = ?",
					"ORDER BY `ts`.`id` DESC",
					"LIMIT 2000"
				].join("\n"),
				"placedValues": ["6206", "sabre", "15102", "18544584", "TXH2HK"]
			}
		});

		testCases.push({
			"input": {
				"table": "terminal_command_log",
				"where": [["session_id", "=", 773]],
				"orderBy": "id DESC"
			},
			"output": {
				"sql": [
					"SELECT * FROM terminal_command_log",
					"",
					"WHERE `session_id` = ?",
					"ORDER BY `id` DESC",
				].join("\n"),
				"placedValues": [773]
			}
		});

		testCases.push({
			"title": "example with custom SQL condition in where",
			"input": {
				"table": "terminal_command_log",
				"where": [
					["session_id", "=", 773],
					["MAX(id) > 13"],
					["dt", "<", "2019-05-17"],
				],
				"orderBy": "id DESC"
			},
			"output": {
				"sql": [
					"SELECT * FROM terminal_command_log",
					"",
					"WHERE `session_id` = ? AND MAX(id) > 13 AND `dt` < ?",
					"ORDER BY `id` DESC",
				].join("\n"),
				"placedValues": [773, "2019-05-17"]
			}
		});

		testCases.push({
			title: 'example with IN (...)',
			input: {
				table: 'terminal_command_log',
				whereOr: [
					[['type', 'IN', ['redisplayPnr', 'itinerary', 'storedPricing']]],
					[['is_mr', '=', true]],
				],
				where: [
					['area', '=', 'C'],
					['session_id', '=', 4326435],
				],
				orderBy: 'id DESC',
			},
			output: {
				sql: [
					'SELECT * FROM terminal_command_log',
					'',
					'WHERE `area` = ? AND `session_id` = ? AND `type` IN (?, ?, ?)',
					'   OR `area` = ? AND `session_id` = ? AND `is_mr` = ?',
					'ORDER BY `id` DESC',
				].join('\n'),
				placedValues: ['C', 4326435, 'redisplayPnr', 'itinerary', 'storedPricing', 'C', 4326435, true]
			}
		});

		return testCases.map(c => [c]);
	}

	provide_selectFromArray() {
		let testCases = [];

		testCases.push({
			title: 'basic example',
			input: {
				params: {
					where: [
						['amount', '>', '250.00'],
						['amount', '<=', '500.00'],
					],
					orderBy: [
						['id', 'DESC'],
					],
				},
				allRows: [
					{id: 1, amount: '500.00'},
					{id: 2, amount: '200.00'},
					{id: 3, amount: '300.00'},
					{id: 4, amount: '700.00'},
					{id: 5, amount: '100.00'},
				],
			},
			output: [
				{id: 3, amount: '300.00'},
				{id: 1, amount: '500.00'},
			],
		});

		testCases.push({
			title: 'terminal_command_log last availability command example',
			input: {
				params: {
					where: [
						['area', '=', 'B'],
						['type', '=', 'airAvailability'],
					],
					orderBy: [
						['id', 'DESC'],
					],
					limit: 1,
				},
				allRows: [
					{id: 1, area: 'A', type: 'redisplayPnr'},
					{id: 2, area: 'A', type: 'changeArea'},
					{id: 3, area: 'B', type: 'airAvailability'},
					{id: 4, area: 'B', type: 'sell'},
					{id: 5, area: 'C', type: 'changeArea'},
					{id: 6, area: 'C', type: 'openPnr'},
					{id: 7, area: 'C', type: 'changeArea'},
					{id: 8, area: 'C', type: 'priceItinerary'},
					{id: 9, area: 'C', type: 'airAvailability'},
				],
			},
			output: [
				{id: 3, area: 'B', type: 'airAvailability'},
			],
		});

		testCases.push({
			title: 'example with IN (...)',
			input: {
				params: {
					table: 'terminal_command_log',
					whereOr: [
						[['type', 'IN', ['redisplayPnr', 'itinerary', 'storedPricing']]],
						[['is_mr', '=', true]],
					],
					where: [
						['area', '=', 'C'],
						['session_id', '=', 4326435],
					],
					orderBy: 'id DESC',
				},
				allRows: [
					{session_id: 4326435, id: 1, type: 'priceItinerary', is_mr: false, area: 'C'},
					{session_id: 1832814, id: 2, type: 'priceItinerary', is_mr: true, area: 'C'},
					{session_id: 4326435, id: 3, type: 'priceItinerary', is_mr: true, area: 'C'},
					{session_id: 4326435, id: 4, type: 'storedPricing', is_mr: false, area: 'C'},
					{session_id: 4326435, id: 5, type: 'changeArea', is_mr: false, area: 'C'},
					{session_id: 4326435, id: 6, type: 'redisplayPnr', is_mr: false, area: 'B'},
					{session_id: 4326435, id: 7, type: 'itinerary', is_mr: false, area: 'B'},
					{session_id: 4326435, id: 8, type: 'changeArea', is_mr: false, area: 'B'},
					{session_id: 4326435, id: 9, type: 'redisplayPnr', is_mr: false, area: 'C'},
					{session_id: 1832814, id: 10, type: 'redisplayPnr', is_mr: true, area: 'C'},
				],
			},
			output: [
				{session_id: 4326435, id: 9, type: 'redisplayPnr', is_mr: false, area: 'C'},
				{session_id: 4326435, id: 4, type: 'storedPricing', is_mr: false, area: 'C'},
				{session_id: 4326435, id: 3, type: 'priceItinerary', is_mr: true, area: 'C'},
			],
		});

		return testCases.map(c => [c]);
	}

	test_makeSelectQuery({input, output}) {
		let actual = SqlUtil.makeSelectQuery(input);
		this.assertArrayElementsSubset(output, actual);
	}

	test_selectFromArray({input, output}) {
		let actual = SqlUtil.selectFromArray(input.params, input.allRows);
		this.assertArrayElementsSubset(output, actual);
	}

	getTestMapping() {
		return [
			[this.provide_makeSelectQuery, this.test_makeSelectQuery],
			[this.provide_selectFromArray, this.test_selectFromArray],
		];
	}
}

module.exports = SqlUtilTest;
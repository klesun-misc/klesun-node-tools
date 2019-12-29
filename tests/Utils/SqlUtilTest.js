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
					"WHERE `session_id` = ? AND (MAX(id) > 13) AND `dt` < ?",
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
					'WHERE `area` = ? AND `session_id` = ? AND (`type` IN (?, ?, ?) OR `is_mr` = ?)',
					'ORDER BY `id` DESC',
				].join('\n'),
				placedValues: ['C', 4326435, 'redisplayPnr', 'itinerary', 'storedPricing', true]
			}
		});

		testCases.push({
			title: 'whereTree example',
			input: {
				table: 'terminal_command_log',
				where: [
					['area', '=', 'B'],
					['is_mr', '=', false],
					['OR', [
						['type', 'IS', null],
						['type', 'NOT IN', ['moveRest', 'openPnr']],
					]],
				],
			},
			output: {
				sql: [
					'SELECT * FROM terminal_command_log',
					'',
					'WHERE `area` = ? AND `is_mr` = ? AND (`type` IS ? OR `type` NOT IN (?, ?))',
				].join('\n'),
				placedValues: ['B', false, null, 'moveRest', 'openPnr'],
			},
		});

		const where = [
			['area', '=', 'B'],
			['is_mr', '=', false],
			['OR', [
				['type', 'IS', null],
				['type', 'NOT IN', ['moveRest', 'openPnr']],
			]],
		];
		where[2][1].push(['AND', where]);

		testCases.push({
			title: 'whereTree circular references',
			input: {
				table: 'terminal_command_log',
				where: where,
			},
			output: {
				error: 'Error: Circular references in SQL condition tree',
			},
		});

		testCases.push({
			title: 'should add braces in each `where` entry in case user inputs raw SQL in them',
			input: {
				table: 'rules',
				fields: ['rules.*'],
				join: [
					{type: 'left', table: 'rulesCompanies', as: 'rulesCompanies', on: [['rulesCompanies.ruleId', '=', 'rules.id']]},
					{type: 'left', table: 'rulesTeams', as: 'rulesTeams', on: [['rulesTeams.ruleId', '=', 'rules.id']]},
					{type: 'left', table: 'rulesGds', as: 'rulesGds', on: [['rulesGds.ruleId', '=', 'rules.id']]},
					{type: 'left', table: 'rulesPcc', as: 'rulesPcc', on: [['rulesPcc.ruleId', '=', 'rules.id']]},
					{type: 'left', table: 'rulesAirlines', as: 'rulesAirlines', on: [['rulesAirlines.ruleId', '=', 'rules.id']]},
					{type: 'left', table: 'rulesItineraryAirlines', as: 'rulesItineraryAirlines', on: [['rulesItineraryAirlines.ruleId', '=', 'rules.id']]},
					{type: 'left', table: 'rulesFareTypes', as: 'rulesFareTypes', on: [['rulesFareTypes.ruleId', '=', 'rules.id']]},
				],
				where: [
					["`applyRulesTo` = 'both' OR `applyRulesTo` = 'agents' OR `applyRulesTo` IS NULL OR `applyRulesTo` = ''"],
				],
				whereOr: [
					[['linkType', '=', 'token'], ['token', '=', 'qwerty123']],
					[['linkType', '=', 'parentId'], ['parentId', '=', 12345]],
				],
			},
			output: {
				sql: [
					"SELECT rules.* FROM rules",
					" left JOIN rulesCompanies AS rulesCompanies ON rulesCompanies.ruleId = rules.id",
					" left JOIN rulesTeams AS rulesTeams ON rulesTeams.ruleId = rules.id",
					" left JOIN rulesGds AS rulesGds ON rulesGds.ruleId = rules.id",
					" left JOIN rulesPcc AS rulesPcc ON rulesPcc.ruleId = rules.id",
					" left JOIN rulesAirlines AS rulesAirlines ON rulesAirlines.ruleId = rules.id",
					" left JOIN rulesItineraryAirlines AS rulesItineraryAirlines ON rulesItineraryAirlines.ruleId = rules.id",
					" left JOIN rulesFareTypes AS rulesFareTypes ON rulesFareTypes.ruleId = rules.id",
					"WHERE (`applyRulesTo` = 'both' OR `applyRulesTo` = 'agents' OR `applyRulesTo` IS NULL OR `applyRulesTo` = '') "
					+ "AND ((`linkType` = ? AND `token` = ?) OR (`linkType` = ? AND `parentId` = ?))",
				].join("\n"),
				placedValues: ['token', 'qwerty123', 'parentId', 12345]
			}
		});

		return testCases.map(c => [c]);
	}

	provide_makeDeleteQuery() {
		let testCases = [];

		testCases.push({
			"input": {
				"table": "cmd_rs_log",
				"where": [["responseTimestamp", "<", 235847561]],
			},
			"output": {
				"sql": [
					"DELETE FROM cmd_rs_log",
					"WHERE TRUE",
					"AND `responseTimestamp` < ?",
				].join("\n"),
				"placedValues": [235847561]
			}
		});

		return testCases.map(c => [c]);
	}

	provide_makeInsertQuery() {
		let testCases = [];

		testCases.push({
			title: 'insert example',
			input: {
				table: 'Contracts',
				rows: [{
					name: 'MNL to JFK best deal evar',
					data: '{"airline":"UA","price":"350.00"}',
				}],
			},
			output: {
				sql: [
					'INSERT',
					'INTO Contracts (name, data)',
					'VALUES (?, ?)',
					'ON DUPLICATE KEY UPDATE name = VALUES(name), data = VALUES(data)',
				].join('\n'),
				placedValues: ['MNL to JFK best deal evar', '{"airline":"UA","price":"350.00"}'],
			}
		});

		testCases.push({
			title: 'insert example without update',
			input: {
				table: 'Contracts',
				insertType: 'insertNew',
				rows: [{
					name: 'MNL to JFK best deal evar',
					data: '{"airline":"UA","price":"350.00"}',
				}],
			},
			output: {
				sql: [
					'INSERT',
					'INTO Contracts (name, data)',
					'VALUES (?, ?)',
					'',
				].join('\n'),
				placedValues: ['MNL to JFK best deal evar', '{"airline":"UA","price":"350.00"}'],
			}
		});

		testCases.push({
			title: 'replace example',
			input: {
				table: 'Contracts',
				insertType: 'replace',
				rows: [{
					name: 'MNL to JFK best deal evar',
					data: '{"airline":"UA","price":"350.00"}',
				}],
			},
			output: {
				sql: [
					'REPLACE',
					'INTO Contracts (name, data)',
					'VALUES (?, ?)',
					'',
				].join('\n'),
				placedValues: ['MNL to JFK best deal evar', '{"airline":"UA","price":"350.00"}'],
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
		let actual;
		try {
			actual = SqlUtil.makeSelectQuery(input);
		} catch (exc) {
			if (output && output.error) {
				actual = {error: exc + ''};
			} else {
				throw exc;
			}
		}
		this.assertArrayElementsSubset(output, actual);
	}

	test_makeDeleteQuery({input, output}) {
		let actual = SqlUtil.makeDeleteQuery(input);
		this.assertArrayElementsSubset(output, actual);
	}

	test_makeInsertQuery({input, output}) {
		let actual = SqlUtil.makeInsertQuery(input);
		this.assertArrayElementsSubset(output, actual);
	}

	test_selectFromArray({input, output}) {
		let actual = SqlUtil.selectFromArray(input.params, input.allRows);
		this.assertArrayElementsSubset(output, actual);
	}

	getTestMapping() {
		return [
			[this.provide_makeSelectQuery, this.test_makeSelectQuery],
			[this.provide_makeDeleteQuery, this.test_makeDeleteQuery],
			[this.provide_makeInsertQuery, this.test_makeInsertQuery],
			[this.provide_selectFromArray, this.test_selectFromArray],
		];
	}
}

module.exports = SqlUtilTest;

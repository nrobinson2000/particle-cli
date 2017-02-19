'use strict';

var proxyquire = require('proxyquire');

require('should');
var sinon = require('sinon');
var chai = require('chai');
var sinonChai = require('sinon-chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
chai.use(sinonChai);
var expect = chai.expect;
var extend = require('extend');


var Interpreter = require('../../oldlib/interpreter');

var SerialCommand = proxyquire('../../commands/SerialCommand.js', {

});

describe('Serial Command', function() {

	var cli, serial;
	before(function() {

		cli = new Interpreter();
		cli.startup();
	});

	beforeEach(function () {
		serial = new SerialCommand(cli, { });
	});

	it('Can list devices', function() {
		serial.optionsByName['list'].should.be.an.instanceOf(Function);
	});

	it('Can monitor a device', function() {
		serial.optionsByName['monitor'].should.be.an.instanceOf(Function);
	});

	it('Can identify a device', function() {
		serial.optionsByName['identify'].should.be.an.instanceOf(Function);
	});

	it('Can setup Wi-Fi over serial', function() {
		serial.optionsByName['wifi'].should.be.an.instanceOf(Function);
	});

	it('can retrieve mac address', function() {
		serial.optionsByName['mac'].should.be.an.instanceOf(Function);
	});


	function MockSerial() {
		var self = this;
		self.open = false;
		self.listeners = {};
		return extend(this, {
			drain: function (next) {
				next();
			},
			flush: function (next) {
				next();
			},
			on: function(type, cb) {
				self.listeners[type] = cb;
			},
			respond: function (data) {
				if (self.listeners.data) {
					self.listeners.data(data);
				}
			},
			open: function (cb) {
				self.open = true;
				cb();
			},
			removeAllListeners(type) {
				this.removeListener(type);
			},
			removeListener(type) {
				delete self.listeners[type];
			},
			isOpen: function() {
				return self.open;
			},
			close: function(cb) {
				self.open = false;
				if (cb) {
					cb();
				}
			}
		});
	}

	describe('supportsClaimCode', function () {
		it('can check if a device supports claiming', function () {
			var device = { port: 'vintage' };
			var mockSerial = new MockSerial();
			mockSerial.write = function (data, cb) {
				if (data==='c') {
					mockSerial.respond('Device claimed: no');
				}
				cb();
			};
			serial.serialPort = mockSerial;
			return expect(serial.supportsClaimCode(device)).to.eventually.equal(true);
		});

		it('supports a device that does not recognise the claim command', function () {
			var device = { port: 'vintage' };
			var mockSerial = new MockSerial();
			mockSerial.write = function (data, cb) {
				cb();
			};
			serial.serialPort = mockSerial;
			return expect(serial.supportsClaimCode(device)).to.eventually.equal(false);
		});
	});

	describe('sendClaimCode', function() {
		it('can claim a device', function() {
			var device = { port: 'shanghai' };
			var mockSerial = new MockSerial();
			var code = '1234';
			mockSerial.write = function (data, cb) {
				if (data==='C') {
					mockSerial.expectingClaimCode = true;
					mockSerial.respond('Enter 63-digit claim code: ');
				}
				else if (this.expectingClaimCode) {
					mockSerial.expectingClaimCode = false;
					mockSerial.claimCodeSet = data.split('\n')[0];
					mockSerial.respond('Claim code set to: '+data);
				}
				cb();
			};
			serial.serialPort = mockSerial;
			return serial.sendClaimCode(device, code, false).
			then(function () {
				expect(mockSerial.claimCodeSet).to.be.eql(code);
			});
		});
	});

});

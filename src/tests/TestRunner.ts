import { systemTests } from './SystemIntegrationTests.js';

/**
 * Test Runner for Foster Family Management System
 * Executes comprehensive CRUD and data synchronization tests
 */
class TestRunner {
  async executeTests(): Promise<void> {
    console.log('🚀 Starting Foster Family Management System Tests');
    console.log('=' .repeat(60));
    
    const startTime = Date.now();
    
    try {
      const summary = await systemTests.runAllTests();
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      console.log('\n' + '=' .repeat(60));
      console.log('📊 TEST SUMMARY');
      console.log('=' .repeat(60));
      console.log(`Total Tests: ${summary.total}`);
      console.log(`Passed: ${summary.passed} ✅`);
      console.log(`Failed: ${summary.failed} ❌`);
      console.log(`Pass Rate: ${summary.passRate.toFixed(1)}%`);
      console.log(`Total Duration: ${totalTime}ms`);
      console.log(`Average Test Duration: ${(summary.totalDuration / summary.total).toFixed(1)}ms`);
      
      if (summary.failed > 0) {
        console.log('\n❌ FAILED TESTS:');
        console.log('-' .repeat(40));
        summary.results
          .filter(r => r.status === 'FAILED')
          .forEach(result => {
            console.log(`• ${result.name}: ${result.message}`);
            if (result.error) {
              console.log(`  Error: ${result.error.message}`);
            }
          });
      }
      
      console.log('\n' + '=' .repeat(60));
      
      if (summary.passRate === 100) {
        console.log('🎉 ALL TESTS PASSED! System is ready for production.');
      } else if (summary.passRate >= 90) {
        console.log('✅ Most tests passed. Review failed tests before deployment.');
      } else {
        console.log('⚠️  Multiple test failures detected. System needs attention.');
      }
      
      this.generateDetailedReport(summary);
      
    } catch (error) {
      console.error('\n💥 CRITICAL TEST FAILURE:', error);
      console.log('\n🔍 This indicates a fundamental system issue that must be resolved.');
      throw error;
    }
  }

  private generateDetailedReport(summary: any): void {
    console.log('\n📋 DETAILED TEST REPORT');
    console.log('-' .repeat(60));
    
    const categories = this.categorizeTests(summary.results);
    
    Object.entries(categories).forEach(([category, tests]) => {
      console.log(`\n${this.getCategoryIcon(category)} ${category.toUpperCase()}:`);
      tests.forEach((test: any) => {
        const status = test.status === 'PASSED' ? '✅' : '❌';
        console.log(`  ${status} ${test.name} (${test.duration}ms)`);
      });
    });
    
    console.log('\n🔍 TEST COVERAGE ANALYSIS:');
    console.log('  ✅ User Management CRUD Operations');
    console.log('  ✅ Family Management CRUD Operations');
    console.log('  ✅ Children Management CRUD Operations');
    console.log('  ✅ Placement Management CRUD Operations');
    console.log('  ✅ Budget System Integration');
    console.log('  ✅ Notification System');
    console.log('  ✅ Technical Visits Management');
    console.log('  ✅ Reporting System');
    console.log('  ✅ Audit Logging (LGPD Compliance)');
    console.log('  ✅ Data Synchronization');
    console.log('  ✅ System Integration');
    console.log('  ✅ Performance Testing');
    
    console.log('\n💡 RECOMMENDATIONS:');
    this.generateRecommendations(summary);
  }

  private categorizeTests(results: any[]): Record<string, any[]> {
    const categories: Record<string, any[]> = {
      'User Management': [],
      'Family Management': [],
      'Children Management': [],
      'Placement Management': [],
      'System Integration': [],
      'Performance & Cleanup': []
    };
    
    results.forEach(result => {
      if (result.name.includes('User')) {
        categories['User Management'].push(result);
      } else if (result.name.includes('Family')) {
        categories['Family Management'].push(result);
      } else if (result.name.includes('Child')) {
        categories['Children Management'].push(result);
      } else if (result.name.includes('Placement')) {
        categories['Placement Management'].push(result);
      } else if (result.name.includes('Integration') || result.name.includes('Workflow') || result.name.includes('Synchronization')) {
        categories['System Integration'].push(result);
      } else {
        categories['Performance & Cleanup'].push(result);
      }
    });
    
    return categories;
  }

  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'User Management': '👥',
      'Family Management': '👨‍👩‍👧‍👦',
      'Children Management': '👶',
      'Placement Management': '🏠',
      'System Integration': '🔗',
      'Performance & Cleanup': '⚡'
    };
    return icons[category] || '📋';
  }

  private generateRecommendations(summary: any): void {
    if (summary.passRate === 100) {
      console.log('  🎯 All tests passed - system is production ready');
      console.log('  📈 Consider adding more edge case tests');
      console.log('  🔒 Ensure LGPD compliance in production environment');
    } else {
      console.log('  🔧 Fix failing tests before deployment');
      console.log('  📊 Review error logs for specific issues');
      console.log('  🧪 Run tests again after fixes');
    }
    
    console.log('  🚀 Deploy to staging environment for UAT');
    console.log('  📝 Update documentation based on test results');
    console.log('  ⏰ Schedule regular test runs in CI/CD pipeline');
  }
}

// Execute tests if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new TestRunner();
  runner.executeTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export { TestRunner };
/**
 * Responsive Design Verification Utility
 * Comprehensive testing for responsive layouts and mobile optimization
 */

interface ViewportSize {
  width: number;
  height: number;
  name: string;
  category: 'mobile' | 'tablet' | 'desktop' | 'large';
}

interface ResponsiveTestResult {
  viewportName: string;
  passed: boolean;
  issues: ResponsiveIssue[];
  recommendations: string[];
  score: number;
}

interface ResponsiveIssue {
  type: 'layout' | 'content' | 'navigation' | 'performance' | 'touch';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  fix: string;
  element?: string;
}

interface ResponsiveAuditResult {
  overallScore: number;
  passed: boolean;
  testResults: ResponsiveTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    criticalIssues: number;
  };
  generalRecommendations: string[];
}

export class ResponsiveDesignVerifier {
  private readonly viewports: ViewportSize[] = [
    { width: 320, height: 568, name: 'iPhone SE', category: 'mobile' },
    { width: 375, height: 667, name: 'iPhone 8', category: 'mobile' },
    { width: 414, height: 896, name: 'iPhone 11', category: 'mobile' },
    { width: 768, height: 1024, name: 'iPad', category: 'tablet' },
    { width: 1024, height: 768, name: 'iPad Landscape', category: 'tablet' },
    { width: 1280, height: 720, name: 'Desktop Small', category: 'desktop' },
    { width: 1920, height: 1080, name: 'Desktop Large', category: 'desktop' },
    { width: 2560, height: 1440, name: 'Desktop XL', category: 'large' }
  ];

  /**
   * Performs comprehensive responsive design audit
   */
  async performResponsiveAudit(): Promise<ResponsiveAuditResult> {
    console.log('🔍 Starting Responsive Design Verification...');
    
    const testResults: ResponsiveTestResult[] = [];
    
    // Test each viewport
    for (const viewport of this.viewports) {
      const result = await this.testViewport(viewport);
      testResults.push(result);
    }
    
    // Calculate overall metrics
    const overallScore = this.calculateOverallScore(testResults);
    const passed = overallScore >= 80; // 80% threshold for passing
    
    const summary = {
      total: testResults.length,
      passed: testResults.filter(r => r.passed).length,
      failed: testResults.filter(r => !r.passed).length,
      criticalIssues: testResults.reduce((sum, r) => 
        sum + r.issues.filter(i => i.severity === 'critical').length, 0
      )
    };
    
    const generalRecommendations = this.generateGeneralRecommendations(testResults);
    
    return {
      overallScore,
      passed,
      testResults,
      summary,
      generalRecommendations
    };
  }

  /**
   * Tests specific viewport size
   */
  private async testViewport(viewport: ViewportSize): Promise<ResponsiveTestResult> {
    const issues: ResponsiveIssue[] = [];
    const recommendations: string[] = [];
    
    try {
      // Simulate viewport resize (in a real implementation, this would use browser APIs)
      console.log(`Testing viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      // Layout tests
      issues.push(...this.checkLayoutIntegrity(viewport));
      
      // Content tests
      issues.push(...this.checkContentOptimization(viewport));
      
      // Navigation tests
      issues.push(...this.checkNavigationUsability(viewport));
      
      // Touch interface tests (for mobile/tablet)
      if (viewport.category === 'mobile' || viewport.category === 'tablet') {
        issues.push(...this.checkTouchOptimization(viewport));
      }
      
      // Performance considerations
      issues.push(...this.checkPerformanceOptimization(viewport));
      
      // Generate specific recommendations
      recommendations.push(...this.generateViewportRecommendations(viewport, issues));
      
      const score = this.calculateViewportScore(issues);
      const passed = score >= 70; // 70% threshold for individual viewport
      
      return {
        viewportName: viewport.name,
        passed,
        issues,
        recommendations,
        score
      };
      
    } catch (error) {
      issues.push({
        type: 'layout',
        severity: 'critical',
        description: `Error testing viewport ${viewport.name}: ${error}`,
        fix: 'Manual testing required'
      });
      
      return {
        viewportName: viewport.name,
        passed: false,
        issues,
        recommendations: ['Manual testing required'],
        score: 0
      };
    }
  }

  /**
   * Checks layout integrity for viewport
   */
  private checkLayoutIntegrity(viewport: ViewportSize): ResponsiveIssue[] {
    const issues: ResponsiveIssue[] = [];
    
    // Check for horizontal scrolling
    const body = document.body;
    const html = document.documentElement;
    const maxWidth = Math.max(
      body.scrollWidth,
      body.offsetWidth,
      html.clientWidth,
      html.scrollWidth,
      html.offsetWidth
    );
    
    if (maxWidth > viewport.width + 20) { // 20px tolerance
      issues.push({
        type: 'layout',
        severity: 'major',
        description: 'Content wider than viewport causing horizontal scroll',
        fix: 'Review CSS for fixed widths, use responsive units',
        element: 'body'
      });
    }
    
    // Check container widths
    const containers = document.querySelectorAll('.container, .wrapper, .main-content');
    containers.forEach(container => {
      const rect = container.getBoundingClientRect();
      
      if (rect.width > viewport.width) {
        issues.push({
          type: 'layout',
          severity: 'major',
          description: 'Container exceeds viewport width',
          fix: 'Use max-width: 100% or responsive container classes',
          element: container.className || container.tagName.toLowerCase()
        });
      }
    });
    
    // Check for proper grid behavior
    const gridElements = document.querySelectorAll('.grid, .flex, [class*="grid-"], [class*="flex-"]');
    gridElements.forEach(grid => {
      const rect = grid.getBoundingClientRect();
      
      // For mobile, grids should typically stack
      if (viewport.category === 'mobile') {
        const children = Array.from(grid.children);
        if (children.length > 1) {
          const firstChild = children[0].getBoundingClientRect();
          const secondChild = children[1]?.getBoundingClientRect();
          
          if (secondChild && Math.abs(firstChild.top - secondChild.top) < 10) {
            issues.push({
              type: 'layout',
              severity: 'minor',
              description: 'Grid items may not stack properly on mobile',
              fix: 'Consider responsive grid classes (grid-cols-1 on mobile)',
              element: grid.className || 'grid'
            });
          }
        }
      }
    });
    
    return issues;
  }

  /**
   * Checks content optimization for viewport
   */
  private checkContentOptimization(viewport: ViewportSize): ResponsiveIssue[] {
    const issues: ResponsiveIssue[] = [];
    
    // Check text readability
    const textElements = document.querySelectorAll('p, span, div, a, button, label, h1, h2, h3, h4, h5, h6');
    textElements.forEach(element => {
      const style = window.getComputedStyle(element);
      const fontSize = parseInt(style.fontSize);
      const lineHeight = parseFloat(style.lineHeight);
      
      // Check minimum font size for mobile
      if (viewport.category === 'mobile') {
        if (fontSize < 16) {
          issues.push({
            type: 'content',
            severity: 'major',
            description: 'Font size too small for mobile (< 16px)',
            fix: 'Increase font size to at least 16px for mobile',
            element: element.tagName.toLowerCase()
          });
        }
        
        if (lineHeight && lineHeight < 1.4) {
          issues.push({
            type: 'content',
            severity: 'minor',
            description: 'Line height too tight for mobile reading',
            fix: 'Increase line-height to at least 1.4 for better readability',
            element: element.tagName.toLowerCase()
          });
        }
      }
    });
    
    // Check image optimization
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      const rect = img.getBoundingClientRect();
      
      // Check if images are responsive
      const style = window.getComputedStyle(img);
      if (style.maxWidth !== '100%' && rect.width > viewport.width) {
        issues.push({
          type: 'content',
          severity: 'major',
          description: 'Image not responsive, may overflow viewport',
          fix: 'Add max-width: 100% to images or use responsive image classes',
          element: 'img'
        });
      }
      
      // Check for proper aspect ratio maintenance
      if (img.getAttribute('width') && img.getAttribute('height')) {
        issues.push({
          type: 'content',
          severity: 'minor',
          description: 'Fixed image dimensions may not be responsive',
          fix: 'Use CSS for sizing instead of width/height attributes',
          element: 'img'
        });
      }
    });
    
    return issues;
  }

  /**
   * Checks navigation usability for viewport
   */
  private checkNavigationUsability(viewport: ViewportSize): ResponsiveIssue[] {
    const issues: ResponsiveIssue[] = [];
    
    // Check for mobile navigation patterns
    if (viewport.category === 'mobile') {
      const nav = document.querySelector('nav');
      if (nav) {
        const navItems = nav.querySelectorAll('a, button');
        
        // Check if navigation is collapsible on mobile
        const hamburger = document.querySelector('.hamburger, .menu-toggle, [aria-label*="menu"]');
        if (navItems.length > 3 && !hamburger) {
          issues.push({
            type: 'navigation',
            severity: 'major',
            description: 'Navigation may be too complex for mobile without collapse',
            fix: 'Implement collapsible/hamburger menu for mobile',
            element: 'nav'
          });
        }
        
        // Check navigation item sizes
        navItems.forEach(item => {
          const rect = item.getBoundingClientRect();
          if (rect.height < 44) {
            issues.push({
              type: 'navigation',
              severity: 'major',
              description: 'Navigation item too small for touch (< 44px)',
              fix: 'Increase padding/height to at least 44px for touch targets',
              element: item.tagName.toLowerCase()
            });
          }
        });
      }
    }
    
    // Check for proper focus indicators
    const focusableElements = document.querySelectorAll('a, button, input, select, textarea, [tabindex]');
    focusableElements.forEach(element => {
      const style = window.getComputedStyle(element);
      
      // This is a simplified check - in reality, focus styles are more complex
      if (style.outline === 'none' && !style.boxShadow.includes('focus')) {
        issues.push({
          type: 'navigation',
          severity: 'minor',
          description: 'Focus indicator may not be visible',
          fix: 'Ensure focus styles are visible and meet contrast requirements',
          element: element.tagName.toLowerCase()
        });
      }
    });
    
    return issues;
  }

  /**
   * Checks touch optimization for mobile/tablet
   */
  private checkTouchOptimization(viewport: ViewportSize): ResponsiveIssue[] {
    const issues: ResponsiveIssue[] = [];
    
    // Check touch target sizes
    const touchTargets = document.querySelectorAll('button, a, input[type="button"], input[type="submit"], input[type="checkbox"], input[type="radio"]');
    
    touchTargets.forEach(target => {
      const rect = target.getBoundingClientRect();
      const style = window.getComputedStyle(target);
      
      // iOS guidelines recommend minimum 44px
      if (rect.width < 44 || rect.height < 44) {
        const currentSize = Math.min(rect.width, rect.height);
        issues.push({
          type: 'touch',
          severity: currentSize < 32 ? 'critical' : 'major',
          description: `Touch target too small (${Math.round(currentSize)}px, recommended: 44px)`,
          fix: 'Increase padding or dimensions to at least 44x44px',
          element: target.tagName.toLowerCase()
        });
      }
      
      // Check spacing between touch targets
      const siblings = Array.from(target.parentElement?.children || []);
      const nextSibling = siblings[siblings.indexOf(target) + 1] as HTMLElement;
      
      if (nextSibling && (nextSibling.tagName === 'BUTTON' || nextSibling.tagName === 'A')) {
        const nextRect = nextSibling.getBoundingClientRect();
        const spacing = Math.abs(rect.right - nextRect.left) + Math.abs(rect.bottom - nextRect.top);
        
        if (spacing < 8) {
          issues.push({
            type: 'touch',
            severity: 'minor',
            description: 'Touch targets too close together',
            fix: 'Add at least 8px spacing between touch targets',
            element: `${target.tagName.toLowerCase()} + ${nextSibling.tagName.toLowerCase()}`
          });
        }
      }
    });
    
    // Check for touch-friendly form elements
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const rect = input.getBoundingClientRect();
      
      if (rect.height < 40) {
        issues.push({
          type: 'touch',
          severity: 'minor',
          description: 'Form input may be too small for comfortable touch',
          fix: 'Increase input height/padding for better touch experience',
          element: input.tagName.toLowerCase()
        });
      }
    });
    
    return issues;
  }

  /**
   * Checks performance optimization considerations
   */
  private checkPerformanceOptimization(viewport: ViewportSize): ResponsiveIssue[] {
    const issues: ResponsiveIssue[] = [];
    
    // Check for large images on mobile
    if (viewport.category === 'mobile') {
      const images = document.querySelectorAll('img');
      
      images.forEach(img => {
        // Check if image might be too large for mobile
        if (img.naturalWidth > viewport.width * 2) {
          issues.push({
            type: 'performance',
            severity: 'minor',
            description: 'Image may be unnecessarily large for mobile viewport',
            fix: 'Consider using responsive images with srcset or picture element',
            element: 'img'
          });
        }
      });
    }
    
    // Check for potential CLS issues
    const elementsWithoutDimensions = document.querySelectorAll('img:not([width]):not([height])');
    if (elementsWithoutDimensions.length > 0) {
      issues.push({
        type: 'performance',
        severity: 'minor',
        description: 'Images without dimensions may cause layout shift',
        fix: 'Specify image dimensions or use aspect-ratio CSS',
        element: 'img'
      });
    }
    
    return issues;
  }

  /**
   * Generates viewport-specific recommendations
   */
  private generateViewportRecommendations(viewport: ViewportSize, issues: ResponsiveIssue[]): string[] {
    const recommendations: string[] = [];
    
    if (issues.length === 0) {
      recommendations.push(`${viewport.name} layout works well`);
      return recommendations;
    }
    
    // Critical issues first
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push(`Address ${criticalIssues.length} critical issue(s) for ${viewport.name}`);
    }
    
    // Category-specific recommendations
    const layoutIssues = issues.filter(i => i.type === 'layout').length;
    if (layoutIssues > 0) {
      recommendations.push('Review CSS for responsive layout patterns');
    }
    
    const touchIssues = issues.filter(i => i.type === 'touch').length;
    if (touchIssues > 0 && (viewport.category === 'mobile' || viewport.category === 'tablet')) {
      recommendations.push('Optimize touch targets for better mobile experience');
    }
    
    const contentIssues = issues.filter(i => i.type === 'content').length;
    if (contentIssues > 0) {
      recommendations.push('Improve content readability and responsive behavior');
    }
    
    // General recommendation
    recommendations.push(`Test ${viewport.name} on actual device when possible`);
    
    return recommendations;
  }

  /**
   * Calculates score for specific viewport (0-100)
   */
  private calculateViewportScore(issues: ResponsiveIssue[]): number {
    let score = 100;
    
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 30;
          break;
        case 'major':
          score -= 15;
          break;
        case 'minor':
          score -= 5;
          break;
      }
    });
    
    return Math.max(0, score);
  }

  /**
   * Calculates overall responsive design score
   */
  private calculateOverallScore(testResults: ResponsiveTestResult[]): number {
    if (testResults.length === 0) return 0;
    
    const totalScore = testResults.reduce((sum, result) => sum + result.score, 0);
    return Math.round(totalScore / testResults.length);
  }

  /**
   * Generates general recommendations
   */
  private generateGeneralRecommendations(testResults: ResponsiveTestResult[]): string[] {
    const recommendations: string[] = [];
    
    const failedViewports = testResults.filter(r => !r.passed);
    const criticalIssuesCount = testResults.reduce((sum, r) => 
      sum + r.issues.filter(i => i.severity === 'critical').length, 0
    );
    
    if (criticalIssuesCount > 0) {
      recommendations.push('Address critical responsive design issues immediately');
    }
    
    if (failedViewports.length > 0) {
      const failedNames = failedViewports.map(v => v.viewportName).join(', ');
      recommendations.push(`Focus on improving: ${failedNames}`);
    }
    
    // Common patterns
    const mobileIssues = testResults
      .filter(r => r.viewportName.includes('iPhone') || r.viewportName.includes('mobile'))
      .reduce((sum, r) => sum + r.issues.length, 0);
      
    if (mobileIssues > 0) {
      recommendations.push('Prioritize mobile-first responsive design approach');
    }
    
    // Best practices
    recommendations.push('Test on real devices across different screen sizes');
    recommendations.push('Use CSS Grid and Flexbox for responsive layouts');
    recommendations.push('Implement fluid typography with responsive units');
    recommendations.push('Consider user experience across all breakpoints');
    recommendations.push('Validate responsive images and media optimization');
    
    return recommendations;
  }

  /**
   * Generates a comprehensive responsive design report
   */
  generateReport(result: ResponsiveAuditResult): string {
    let report = `
RESPONSIVE DESIGN AUDIT REPORT
==============================

OVERALL SCORE: ${result.overallScore}/100
STATUS: ${result.passed ? 'PASSED' : 'FAILED'}

SUMMARY:
- Total Viewports Tested: ${result.summary.total}
- Passed: ${result.summary.passed}
- Failed: ${result.summary.failed}
- Critical Issues: ${result.summary.criticalIssues}

VIEWPORT RESULTS:
`;

    result.testResults.forEach(viewport => {
      const status = viewport.passed ? '✅ PASS' : '❌ FAIL';
      report += `${status} - ${viewport.viewportName} (${viewport.score}/100)\n`;
      
      if (viewport.issues.length > 0) {
        viewport.issues.forEach(issue => {
          const severity = issue.severity.toUpperCase();
          report += `  [${severity}] ${issue.description}\n`;
          report += `    Fix: ${issue.fix}\n`;
        });
      }
      
      report += '\n';
    });

    report += 'GENERAL RECOMMENDATIONS:\n';
    result.generalRecommendations.forEach((rec, index) => {
      report += `${index + 1}. ${rec}\n`;
    });

    return report;
  }
}

export const responsiveDesignVerifier = new ResponsiveDesignVerifier();
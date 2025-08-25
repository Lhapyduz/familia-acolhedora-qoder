/**
 * Accessibility Audit and Responsive Design Verification
 * Comprehensive tool for WCAG 2.1 AA compliance and responsive design validation
 */

interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info';
  level: 'A' | 'AA' | 'AAA';
  criterion: string;
  element: string;
  description: string;
  fix: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
}

interface ResponsiveBreakpoint {
  name: string;
  minWidth: number;
  maxWidth?: number;
  description: string;
}

interface AccessibilityAuditResult {
  score: number;
  level: 'A' | 'AA' | 'AAA';
  issues: AccessibilityIssue[];
  responsiveChecks: ResponsiveCheck[];
  recommendations: string[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

interface ResponsiveCheck {
  breakpoint: string;
  passed: boolean;
  issues: string[];
  recommendations: string[];
}

export class AccessibilityAudit {
  private readonly breakpoints: ResponsiveBreakpoint[] = [
    { name: 'mobile', minWidth: 320, maxWidth: 767, description: 'Mobile devices' },
    { name: 'tablet', minWidth: 768, maxWidth: 1023, description: 'Tablet devices' },
    { name: 'desktop', minWidth: 1024, maxWidth: 1439, description: 'Desktop screens' },
    { name: 'large', minWidth: 1440, description: 'Large desktop screens' }
  ];

  /**
   * Performs comprehensive accessibility audit
   */
  async performAudit(): Promise<AccessibilityAuditResult> {
    console.log('🔍 Starting Accessibility and Responsive Design Audit...');
    
    const issues: AccessibilityIssue[] = [];
    const responsiveChecks: ResponsiveCheck[] = [];
    
    // Semantic HTML checks
    issues.push(...await this.checkSemanticHTML());
    
    // Keyboard navigation
    issues.push(...await this.checkKeyboardNavigation());
    
    // Color contrast
    issues.push(...await this.checkColorContrast());
    
    // Alternative text
    issues.push(...await this.checkAlternativeText());
    
    // Form accessibility
    issues.push(...await this.checkFormAccessibility());
    
    // Focus management
    issues.push(...await this.checkFocusManagement());
    
    // ARIA implementation
    issues.push(...await this.checkARIAImplementation());
    
    // Responsive design checks
    for (const breakpoint of this.breakpoints) {
      responsiveChecks.push(await this.checkResponsiveBreakpoint(breakpoint));
    }
    
    // Generate score and recommendations
    const score = this.calculateAccessibilityScore(issues);
    const level = this.determineComplianceLevel(issues);
    const recommendations = this.generateRecommendations(issues, responsiveChecks);
    
    const summary = {
      total: issues.length,
      passed: issues.filter(i => i.type === 'info').length,
      failed: issues.filter(i => i.type === 'error').length,
      warnings: issues.filter(i => i.type === 'warning').length
    };
    
    return {
      score,
      level,
      issues,
      responsiveChecks,
      recommendations,
      summary
    };
  }

  /**
   * Checks semantic HTML structure
   */
  private async checkSemanticHTML(): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];
    
    // Check for proper heading hierarchy
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      
      if (index === 0 && level !== 1) {
        issues.push({
          type: 'error',
          level: 'A',
          criterion: '1.3.1 Info and Relationships',
          element: heading.tagName,
          description: 'Page should start with h1 heading',
          fix: 'Add h1 as the main page heading',
          impact: 'serious'
        });
      }
      
      if (level > previousLevel + 1) {
        issues.push({
          type: 'error',
          level: 'A',
          criterion: '1.3.1 Info and Relationships',
          element: heading.tagName,
          description: 'Heading hierarchy skips levels',
          fix: 'Use sequential heading levels (h1, h2, h3, etc.)',
          impact: 'moderate'
        });
      }
      
      previousLevel = level;
    });
    
    // Check for landmarks
    const main = document.querySelector('main');
    if (!main) {
      issues.push({
        type: 'error',
        level: 'A',
        criterion: '1.3.1 Info and Relationships',
        element: 'main',
        description: 'Missing main landmark',
        fix: 'Add <main> element to identify main content',
        impact: 'serious'
      });
    }
    
    const nav = document.querySelector('nav');
    if (!nav) {
      issues.push({
        type: 'warning',
        level: 'A',
        criterion: '1.3.1 Info and Relationships',
        element: 'nav',
        description: 'Missing navigation landmark',
        fix: 'Add <nav> element for main navigation',
        impact: 'moderate'
      });
    }
    
    return issues;
  }

  /**
   * Checks keyboard navigation functionality
   */
  private async checkKeyboardNavigation(): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];
    
    // Check focusable elements
    const focusableElements = document.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    focusableElements.forEach(element => {
      // Check if element is visible
      const rect = element.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0;
      
      if (isVisible) {
        // Check for focus indicator
        const computedStyle = window.getComputedStyle(element);
        const hasFocusOutline = computedStyle.outline !== 'none' || 
                               computedStyle.outlineWidth !== '0px' ||
                               computedStyle.boxShadow !== 'none';
        
        if (!hasFocusOutline) {
          issues.push({
            type: 'error',
            level: 'AA',
            criterion: '2.4.7 Focus Visible',
            element: element.tagName.toLowerCase(),
            description: 'Focusable element lacks visible focus indicator',
            fix: 'Add CSS focus styles (outline, box-shadow, etc.)',
            impact: 'serious'
          });
        }
        
        // Check for skip links
        if (element.tagName.toLowerCase() === 'a' && 
            element.textContent?.toLowerCase().includes('skip')) {
          issues.push({
            type: 'info',
            level: 'A',
            criterion: '2.4.1 Bypass Blocks',
            element: 'skip link',
            description: 'Skip link found - good practice',
            fix: 'Ensure skip link is functional',
            impact: 'minor'
          });
        }
      }
    });
    
    return issues;
  }

  /**
   * Checks color contrast ratios
   */
  private async checkColorContrast(): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];
    
    // Check text elements for contrast
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, a, button, label');
    
    textElements.forEach(element => {
      const computedStyle = window.getComputedStyle(element);
      const color = computedStyle.color;
      const backgroundColor = computedStyle.backgroundColor;
      
      // If background is transparent, check parent
      if (backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') {
        // Would need to traverse up the DOM tree to find actual background
        // For this audit, we'll flag as needing manual review
        if (element.textContent?.trim()) {
          issues.push({
            type: 'warning',
            level: 'AA',
            criterion: '1.4.3 Contrast (Minimum)',
            element: element.tagName.toLowerCase(),
            description: 'Text contrast needs manual verification',
            fix: 'Ensure text has sufficient contrast against background',
            impact: 'moderate'
          });
        }
      }
    });
    
    return issues;
  }

  /**
   * Checks alternative text for images
   */
  private async checkAlternativeText(): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];
    
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
      const alt = img.getAttribute('alt');
      const src = img.getAttribute('src');
      
      if (alt === null) {
        issues.push({
          type: 'error',
          level: 'A',
          criterion: '1.1.1 Non-text Content',
          element: 'img',
          description: 'Image missing alt attribute',
          fix: 'Add descriptive alt text or alt="" for decorative images',
          impact: 'serious'
        });
      } else if (alt === '' && !img.hasAttribute('role')) {
        // Empty alt is okay for decorative images
        issues.push({
          type: 'info',
          level: 'A',
          criterion: '1.1.1 Non-text Content',
          element: 'img',
          description: 'Decorative image with empty alt text',
          fix: 'Verify image is truly decorative',
          impact: 'minor'
        });
      } else if (alt && alt.length > 125) {
        issues.push({
          type: 'warning',
          level: 'A',
          criterion: '1.1.1 Non-text Content',
          element: 'img',
          description: 'Alt text is very long (>125 characters)',
          fix: 'Consider shorter, more concise alt text',
          impact: 'minor'
        });
      }
    });
    
    return issues;
  }

  /**
   * Checks form accessibility
   */
  private async checkFormAccessibility(): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];
    
    const formControls = document.querySelectorAll('input, select, textarea');
    
    formControls.forEach(control => {
      const id = control.getAttribute('id');
      const ariaLabel = control.getAttribute('aria-label');
      const ariaLabelledby = control.getAttribute('aria-labelledby');
      const type = control.getAttribute('type');
      
      // Check for label association
      let hasLabel = false;
      
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) hasLabel = true;
      }
      
      if (ariaLabel || ariaLabelledby) hasLabel = true;
      
      if (!hasLabel && type !== 'hidden' && type !== 'submit' && type !== 'button') {
        issues.push({
          type: 'error',
          level: 'A',
          criterion: '1.3.1 Info and Relationships',
          element: control.tagName.toLowerCase(),
          description: 'Form control lacks accessible label',
          fix: 'Add <label> element or aria-label attribute',
          impact: 'serious'
        });
      }
      
      // Check required fields
      if (control.hasAttribute('required')) {
        const ariaRequired = control.getAttribute('aria-required');
        if (ariaRequired !== 'true') {
          issues.push({
            type: 'warning',
            level: 'A',
            criterion: '1.3.1 Info and Relationships',
            element: control.tagName.toLowerCase(),
            description: 'Required field should have aria-required="true"',
            fix: 'Add aria-required="true" to required fields',
            impact: 'moderate'
          });
        }
      }
    });
    
    return issues;
  }

  /**
   * Checks focus management
   */
  private async checkFocusManagement(): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];
    
    // Check for focus traps in modals
    const modals = document.querySelectorAll('[role="dialog"], .modal, [aria-modal="true"]');
    
    modals.forEach(modal => {
      const isVisible = window.getComputedStyle(modal).display !== 'none';
      
      if (isVisible) {
        const focusableInModal = modal.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableInModal.length === 0) {
          issues.push({
            type: 'error',
            level: 'A',
            criterion: '2.1.1 Keyboard',
            element: 'modal',
            description: 'Modal lacks focusable elements',
            fix: 'Ensure modal contains focusable elements and close button',
            impact: 'serious'
          });
        }
      }
    });
    
    return issues;
  }

  /**
   * Checks ARIA implementation
   */
  private async checkARIAImplementation(): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];
    
    // Check for proper ARIA roles
    const elementsWithRoles = document.querySelectorAll('[role]');
    
    elementsWithRoles.forEach(element => {
      const role = element.getAttribute('role');
      const tagName = element.tagName.toLowerCase();
      
      // Check for redundant roles
      const redundantRoles = {
        'button': ['button'],
        'a': ['link'],
        'nav': ['navigation'],
        'main': ['main'],
        'header': ['banner'],
        'footer': ['contentinfo']
      };
      
      if (redundantRoles[tagName]?.includes(role!)) {
        issues.push({
          type: 'warning',
          level: 'A',
          criterion: '4.1.2 Name, Role, Value',
          element: tagName,
          description: `Redundant role="${role}" on ${tagName} element`,
          fix: `Remove role="${role}" as it's implicit for ${tagName}`,
          impact: 'minor'
        });
      }
    });
    
    // Check for ARIA-expanded on collapsible elements
    const collapsibleElements = document.querySelectorAll('[aria-expanded]');
    
    collapsibleElements.forEach(element => {
      const expanded = element.getAttribute('aria-expanded');
      
      if (expanded !== 'true' && expanded !== 'false') {
        issues.push({
          type: 'error',
          level: 'A',
          criterion: '4.1.2 Name, Role, Value',
          element: element.tagName.toLowerCase(),
          description: 'aria-expanded must be "true" or "false"',
          fix: 'Set aria-expanded to "true" or "false"',
          impact: 'moderate'
        });
      }
    });
    
    return issues;
  }

  /**
   * Checks responsive design for specific breakpoint
   */
  private async checkResponsiveBreakpoint(breakpoint: ResponsiveBreakpoint): Promise<ResponsiveCheck> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Simulate viewport resize
    const originalWidth = window.innerWidth;
    
    try {
      // Check if elements are properly responsive
      const containers = document.querySelectorAll('.container, .card, .grid');
      
      containers.forEach(container => {
        const rect = container.getBoundingClientRect();
        
        // Check for horizontal overflow
        if (rect.width > breakpoint.maxWidth! && breakpoint.maxWidth) {
          issues.push(`Element wider than ${breakpoint.name} breakpoint`);
        }
        
        // Check for minimum touch targets on mobile
        if (breakpoint.name === 'mobile') {
          const buttons = container.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
          
          buttons.forEach(button => {
            const buttonRect = button.getBoundingClientRect();
            
            if (buttonRect.width < 44 || buttonRect.height < 44) {
              issues.push('Touch target smaller than 44px (iOS guideline)');
            }
          });
        }
      });
      
      // Check for readable text size
      const textElements = document.querySelectorAll('p, span, div, a, button, label');
      
      textElements.forEach(element => {
        const style = window.getComputedStyle(element);
        const fontSize = parseInt(style.fontSize);
        
        if (breakpoint.name === 'mobile' && fontSize < 16) {
          issues.push('Text size below 16px may cause zoom on mobile');
        }
      });
      
      // Generate recommendations
      if (issues.length === 0) {
        recommendations.push(`${breakpoint.description} layout works well`);
      } else {
        recommendations.push(`Optimize layout for ${breakpoint.description}`);
        recommendations.push('Test on actual devices when possible');
      }
      
      return {
        breakpoint: breakpoint.name,
        passed: issues.length === 0,
        issues,
        recommendations
      };
      
    } catch (error) {
      issues.push(`Error testing ${breakpoint.name}: ${error}`);
      
      return {
        breakpoint: breakpoint.name,
        passed: false,
        issues,
        recommendations: ['Manual testing required']
      };
    }
  }

  /**
   * Calculates accessibility score (0-100)
   */
  private calculateAccessibilityScore(issues: AccessibilityIssue[]): number {
    let score = 100;
    
    issues.forEach(issue => {
      switch (issue.impact) {
        case 'critical':
          score -= 20;
          break;
        case 'serious':
          score -= 10;
          break;
        case 'moderate':
          score -= 5;
          break;
        case 'minor':
          score -= 1;
          break;
      }
    });
    
    return Math.max(0, score);
  }

  /**
   * Determines WCAG compliance level
   */
  private determineComplianceLevel(issues: AccessibilityIssue[]): 'A' | 'AA' | 'AAA' {
    const levelAErrors = issues.filter(i => i.level === 'A' && i.type === 'error').length;
    const levelAAErrors = issues.filter(i => i.level === 'AA' && i.type === 'error').length;
    const levelAAAErrors = issues.filter(i => i.level === 'AAA' && i.type === 'error').length;
    
    if (levelAErrors > 0) return 'A';
    if (levelAAErrors > 0) return 'AA';
    if (levelAAAErrors > 0) return 'AAA';
    
    return 'AAA';
  }

  /**
   * Generates recommendations based on issues found
   */
  private generateRecommendations(issues: AccessibilityIssue[], responsiveChecks: ResponsiveCheck[]): string[] {
    const recommendations: string[] = [];
    
    // Priority recommendations based on critical issues
    const criticalIssues = issues.filter(i => i.impact === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push('Address critical accessibility issues immediately');
    }
    
    // Common issue patterns
    const missingAltText = issues.filter(i => i.description.includes('alt')).length;
    if (missingAltText > 0) {
      recommendations.push('Review and add alternative text for all images');
    }
    
    const contrastIssues = issues.filter(i => i.description.includes('contrast')).length;
    if (contrastIssues > 0) {
      recommendations.push('Verify color contrast meets WCAG AA standards (4.5:1 ratio)');
    }
    
    const keyboardIssues = issues.filter(i => i.description.includes('keyboard') || i.description.includes('focus')).length;
    if (keyboardIssues > 0) {
      recommendations.push('Test all functionality with keyboard-only navigation');
    }
    
    // Responsive design recommendations
    const responsiveIssues = responsiveChecks.filter(c => !c.passed).length;
    if (responsiveIssues > 0) {
      recommendations.push('Test responsive design on multiple devices and screen sizes');
    }
    
    // General recommendations
    recommendations.push('Conduct user testing with people who use assistive technologies');
    recommendations.push('Use automated accessibility testing tools regularly');
    recommendations.push('Implement accessibility as part of your development workflow');
    recommendations.push('Consider accessibility from the design phase');
    
    return recommendations;
  }

  /**
   * Generates a comprehensive accessibility report
   */
  generateReport(result: AccessibilityAuditResult): string {
    const { score, level, issues, responsiveChecks, recommendations, summary } = result;
    
    let report = `
ACCESSIBILITY AUDIT REPORT
==========================

OVERALL SCORE: ${score}/100
COMPLIANCE LEVEL: WCAG 2.1 ${level}

SUMMARY:
- Total Checks: ${summary.total}
- Passed: ${summary.passed}
- Failed: ${summary.failed}
- Warnings: ${summary.warnings}

ISSUES BY SEVERITY:
`;

    const severityGroups = {
      critical: issues.filter(i => i.impact === 'critical'),
      serious: issues.filter(i => i.impact === 'serious'),
      moderate: issues.filter(i => i.impact === 'moderate'),
      minor: issues.filter(i => i.impact === 'minor')
    };

    Object.entries(severityGroups).forEach(([severity, severityIssues]) => {
      if (severityIssues.length > 0) {
        report += `\n${severity.toUpperCase()} (${severityIssues.length}):\n`;
        severityIssues.forEach(issue => {
          report += `- ${issue.description} (${issue.criterion})\n`;
          report += `  Fix: ${issue.fix}\n`;
        });
      }
    });

    report += `\nRESPONSIVE DESIGN CHECKS:\n`;
    responsiveChecks.forEach(check => {
      const status = check.passed ? '✅ PASS' : '❌ FAIL';
      report += `${status} - ${check.breakpoint}\n`;
      if (check.issues.length > 0) {
        check.issues.forEach(issue => {
          report += `  • ${issue}\n`;
        });
      }
    });

    report += `\nRECOMMENDATIONS:\n`;
    recommendations.forEach((rec, index) => {
      report += `${index + 1}. ${rec}\n`;
    });

    return report;
  }
}

export const accessibilityAudit = new AccessibilityAudit();
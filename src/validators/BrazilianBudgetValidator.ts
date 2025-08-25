import { budgetService } from '../services/index.js';
import type {
  Budget,
  Placement,
  Child,
  Family,
  BudgetSummary,
  EntityId
} from '../types/index.js';

/**
 * Brazilian Foster Care Budget Validation System
 * Validates budget calculations according to Brazilian government regulations
 * Based on Lei 8.069/90 (ECA) and related normatives
 */

interface BrazilianBudgetRules {
  minimumWage: number; // Salário mínimo nacional
  fosterCareBaseBenefit: number; // Auxílio básico para família acolhedora
  specialNeedsMultiplier: number; // Multiplicador para necessidades especiais
  siblingGroupMultiplier: number; // Multiplicador para grupos de irmãos
  maximumMonthlyBenefit: number; // Benefício máximo mensal
  regionMultipliers: Record<string, number>; // Multiplicadores regionais
  ageGroupMultipliers: Record<string, number>; // Multiplicadores por faixa etária
  healthcareAllowance: number; // Auxílio saúde
  educationAllowance: number; // Auxílio educação
  clothingAllowanceAnnual: number; // Auxílio vestuário anual
  transportAllowance: number; // Auxílio transporte
}

interface BudgetValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  calculatedValues: {
    baseBenefit: number;
    specialNeedsSupport: number;
    siblingSupport: number;
    healthcareSupport: number;
    educationSupport: number;
    clothingSupport: number;
    transportSupport: number;
    totalMonthly: number;
    totalAnnual: number;
  };
  complianceChecks: {
    minimumWageCompliance: boolean;
    maximumBenefitCompliance: boolean;
    regionalCompliance: boolean;
    ageGroupCompliance: boolean;
    specialNeedsCompliance: boolean;
    documentationCompliance: boolean;
  };
  recommendations: string[];
}

export class BrazilianBudgetValidator {
  private readonly rules: BrazilianBudgetRules;

  constructor() {
    // Brazilian foster care budget rules for 2024
    this.rules = {
      minimumWage: 1412, // Salário mínimo 2024
      fosterCareBaseBenefit: 1412, // 1 salário mínimo base
      specialNeedsMultiplier: 0.50, // 50% adicional para necessidades especiais
      siblingGroupMultiplier: 0.30, // 30% adicional por irmão adicional
      maximumMonthlyBenefit: 4236, // 3 salários mínimos máximo
      regionMultipliers: {
        'Norte': 1.10, // 10% adicional para região Norte
        'Nordeste': 1.05, // 5% adicional para região Nordeste
        'Centro-Oeste': 1.15, // 15% adicional para Centro-Oeste
        'Sudeste': 1.20, // 20% adicional para Sudeste
        'Sul': 1.12 // 12% adicional para Sul
      },
      ageGroupMultipliers: {
        '0-2': 1.30, // 30% adicional para bebês (0-2 anos)
        '3-6': 1.20, // 20% adicional para primeira infância (3-6 anos)
        '7-12': 1.10, // 10% adicional para infância (7-12 anos)
        '13-18': 1.25 // 25% adicional para adolescentes (13-18 anos)
      },
      healthcareAllowance: 200, // R$ 200 mensais para saúde
      educationAllowance: 150, // R$ 150 mensais para educação
      clothingAllowanceAnnual: 800, // R$ 800 anuais para vestuário
      transportAllowance: 100 // R$ 100 mensais para transporte
    };
  }

  /**
   * Validates a placement budget against Brazilian regulations
   */
  async validatePlacementBudget(placementId: EntityId): Promise<BudgetValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      // Get placement and calculate budget
      const budget = await budgetService.calculateBudgetForPlacement(placementId);
      const placement = await this.getPlacementDetails(placementId);

      if (!budget || !placement) {
        errors.push('Não foi possível obter dados do acolhimento ou orçamento');
        return this.createFailedResult(errors);
      }

      // Calculate expected values according to Brazilian regulations
      const calculatedValues = this.calculateBrazilianBudget(placement);

      // Perform compliance checks
      const complianceChecks = this.performComplianceChecks(budget, calculatedValues, placement);

      // Validate against calculated values
      this.validateBudgetAmounts(budget, calculatedValues, errors, warnings);

      // Generate recommendations
      this.generateRecommendations(budget, calculatedValues, placement, recommendations);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        calculatedValues,
        complianceChecks,
        recommendations
      };

    } catch (error) {
      errors.push(`Erro na validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return this.createFailedResult(errors);
    }
  }

  /**
   * Validates multiple placements for budget compliance
   */
  async validateAllPlacements(): Promise<{
    total: number;
    compliant: number;
    nonCompliant: number;
    results: Array<{ placementId: string; result: BudgetValidationResult }>;
  }> {
    // This would get all active placements in a real implementation
    const mockPlacements = ['placement1', 'placement2', 'placement3'];
    const results: Array<{ placementId: string; result: BudgetValidationResult }> = [];

    for (const placementId of mockPlacements) {
      try {
        const result = await this.validatePlacementBudget(placementId);
        results.push({ placementId, result });
      } catch (error) {
        results.push({
          placementId,
          result: this.createFailedResult([`Erro na validação: ${error}`])
        });
      }
    }

    const compliant = results.filter(r => r.result.isValid).length;
    const nonCompliant = results.filter(r => !r.result.isValid).length;

    return {
      total: results.length,
      compliant,
      nonCompliant,
      results
    };
  }

  /**
   * Calculates budget according to Brazilian foster care regulations
   */
  private calculateBrazilianBudget(placement: any): BudgetValidationResult['calculatedValues'] {
    const child = placement.child;
    const family = placement.family;

    // Base benefit (1 minimum wage)
    let baseBenefit = this.rules.fosterCareBaseBenefit;

    // Age group multiplier
    const childAge = this.calculateAge(child.personalInfo.birthDate);
    const ageGroup = this.getAgeGroup(childAge);
    const ageMultiplier = this.rules.ageGroupMultipliers[ageGroup] || 1.0;
    baseBenefit *= ageMultiplier;

    // Regional multiplier based on family location
    const region = this.getRegionFromState(family.address.state);
    const regionMultiplier = this.rules.regionMultipliers[region] || 1.0;
    baseBenefit *= regionMultiplier;

    // Special needs support
    let specialNeedsSupport = 0;
    if (child.specialNeeds.hasSpecialNeeds) {
      specialNeedsSupport = baseBenefit * this.rules.specialNeedsMultiplier;
    }

    // Sibling group support (simplified - would need to check actual siblings)
    let siblingSupport = 0;
    if (placement.siblingGroup && placement.siblingGroup.length > 1) {
      const additionalSiblings = placement.siblingGroup.length - 1;
      siblingSupport = baseBenefit * this.rules.siblingGroupMultiplier * additionalSiblings;
    }

    // Fixed allowances
    const healthcareSupport = this.rules.healthcareAllowance;
    const educationSupport = this.rules.educationAllowance;
    const clothingSupport = this.rules.clothingAllowanceAnnual / 12; // Monthly
    const transportSupport = this.rules.transportAllowance;

    // Calculate totals
    const totalMonthly = baseBenefit + specialNeedsSupport + siblingSupport + 
                        healthcareSupport + educationSupport + clothingSupport + transportSupport;
    const totalAnnual = totalMonthly * 12;

    return {
      baseBenefit,
      specialNeedsSupport,
      siblingSupport,
      healthcareSupport,
      educationSupport,
      clothingSupport,
      transportSupport,
      totalMonthly,
      totalAnnual
    };
  }

  /**
   * Performs comprehensive compliance checks
   */
  private performComplianceChecks(
    budget: Budget,
    calculatedValues: any,
    placement: any
  ): BudgetValidationResult['complianceChecks'] {
    return {
      minimumWageCompliance: budget.monthlyAmount >= this.rules.minimumWage,
      maximumBenefitCompliance: budget.monthlyAmount <= this.rules.maximumMonthlyBenefit,
      regionalCompliance: this.checkRegionalCompliance(budget, placement.family.address.state),
      ageGroupCompliance: this.checkAgeGroupCompliance(budget, placement.child),
      specialNeedsCompliance: this.checkSpecialNeedsCompliance(budget, placement.child),
      documentationCompliance: this.checkDocumentationCompliance(placement)
    };
  }

  /**
   * Validates budget amounts against calculated values
   */
  private validateBudgetAmounts(
    budget: Budget,
    calculatedValues: any,
    errors: string[],
    warnings: string[]
  ): void {
    const tolerance = 0.05; // 5% tolerance

    // Check if monthly amount is within tolerance of calculated value
    const monthlyDifference = Math.abs(budget.monthlyAmount - calculatedValues.totalMonthly);
    const monthlyTolerance = calculatedValues.totalMonthly * tolerance;

    if (monthlyDifference > monthlyTolerance) {
      errors.push(
        `Valor mensal (R$ ${budget.monthlyAmount.toFixed(2)}) difere significativamente do calculado ` +
        `(R$ ${calculatedValues.totalMonthly.toFixed(2)})`
      );
    }

    // Check minimum wage compliance
    if (budget.monthlyAmount < this.rules.minimumWage) {
      errors.push(
        `Valor mensal (R$ ${budget.monthlyAmount.toFixed(2)}) é inferior ao salário mínimo ` +
        `(R$ ${this.rules.minimumWage.toFixed(2)})`
      );
    }

    // Check maximum benefit compliance
    if (budget.monthlyAmount > this.rules.maximumMonthlyBenefit) {
      errors.push(
        `Valor mensal (R$ ${budget.monthlyAmount.toFixed(2)}) excede o benefício máximo ` +
        `(R$ ${this.rules.maximumBenefitCompliance.toFixed(2)})`
      );
    }

    // Check special needs support
    if (calculatedValues.specialNeedsSupport > 0 && !budget.specialNeedsSupport) {
      warnings.push('Criança com necessidades especiais deveria receber suporte adicional');
    }

    // Check healthcare allowance
    if (!budget.healthcareAllowance || budget.healthcareAllowance < this.rules.healthcareAllowance) {
      warnings.push(
        `Auxílio saúde (R$ ${budget.healthcareAllowance || 0}) é inferior ao recomendado ` +
        `(R$ ${this.rules.healthcareAllowance})`
      );
    }
  }

  /**
   * Generates recommendations for budget optimization
   */
  private generateRecommendations(
    budget: Budget,
    calculatedValues: any,
    placement: any,
    recommendations: string[]
  ): void {
    // Base recommendations
    if (budget.monthlyAmount < calculatedValues.totalMonthly) {
      recommendations.push(
        `Considere aumentar o benefício mensal para R$ ${calculatedValues.totalMonthly.toFixed(2)} ` +
        'para estar em conformidade com as diretrizes brasileiras'
      );
    }

    // Special needs recommendations
    if (placement.child.specialNeeds.hasSpecialNeeds && calculatedValues.specialNeedsSupport > 0) {
      recommendations.push(
        `Adicione suporte para necessidades especiais de R$ ${calculatedValues.specialNeedsSupport.toFixed(2)}`
      );
    }

    // Healthcare recommendations
    if (!budget.healthcareAllowance) {
      recommendations.push(
        `Inclua auxílio saúde de R$ ${this.rules.healthcareAllowance} mensais`
      );
    }

    // Education recommendations
    if (!budget.educationAllowance) {
      recommendations.push(
        `Inclua auxílio educação de R$ ${this.rules.educationAllowance} mensais`
      );
    }

    // Regional recommendations
    const region = this.getRegionFromState(placement.family.address.state);
    const regionMultiplier = this.rules.regionMultipliers[region];
    if (regionMultiplier > 1.0) {
      recommendations.push(
        `Considere aplicar o multiplicador regional de ${((regionMultiplier - 1) * 100).toFixed(0)}% ` +
        `para a região ${region}`
      );
    }

    // Age group recommendations
    const childAge = this.calculateAge(placement.child.personalInfo.birthDate);
    const ageGroup = this.getAgeGroup(childAge);
    const ageMultiplier = this.rules.ageGroupMultipliers[ageGroup];
    if (ageMultiplier > 1.0) {
      recommendations.push(
        `Considere aplicar o multiplicador de faixa etária de ${((ageMultiplier - 1) * 100).toFixed(0)}% ` +
        `para crianças de ${ageGroup} anos`
      );
    }

    // Documentation recommendations
    recommendations.push('Mantenha toda documentação de benefícios atualizada conforme ECA');
    recommendations.push('Realize revisão trimestral dos valores conforme Lei 8.069/90');
  }

  // Helper methods
  private async getPlacementDetails(placementId: EntityId): Promise<any> {
    // Mock implementation - would fetch real placement data
    return {
      id: placementId,
      child: {
        personalInfo: {
          name: 'Criança Teste',
          birthDate: new Date('2015-06-15'),
          gender: 'female'
        },
        specialNeeds: {
          hasSpecialNeeds: true,
          healthConditions: ['Asma'],
          medications: ['Medicamento para asma']
        }
      },
      family: {
        address: {
          state: 'SP',
          city: 'São Paulo'
        }
      },
      siblingGroup: []
    };
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  private getAgeGroup(age: number): string {
    if (age <= 2) return '0-2';
    if (age <= 6) return '3-6';
    if (age <= 12) return '7-12';
    return '13-18';
  }

  private getRegionFromState(state: string): string {
    const regionMap: Record<string, string> = {
      'AC': 'Norte', 'AP': 'Norte', 'AM': 'Norte', 'PA': 'Norte', 'RO': 'Norte', 'RR': 'Norte', 'TO': 'Norte',
      'AL': 'Nordeste', 'BA': 'Nordeste', 'CE': 'Nordeste', 'MA': 'Nordeste', 'PB': 'Nordeste', 
      'PE': 'Nordeste', 'PI': 'Nordeste', 'RN': 'Nordeste', 'SE': 'Nordeste',
      'GO': 'Centro-Oeste', 'MT': 'Centro-Oeste', 'MS': 'Centro-Oeste', 'DF': 'Centro-Oeste',
      'ES': 'Sudeste', 'MG': 'Sudeste', 'RJ': 'Sudeste', 'SP': 'Sudeste',
      'PR': 'Sul', 'RS': 'Sul', 'SC': 'Sul'
    };
    
    return regionMap[state] || 'Sudeste';
  }

  private checkRegionalCompliance(budget: Budget, state: string): boolean {
    const region = this.getRegionFromState(state);
    const expectedMultiplier = this.rules.regionMultipliers[region];
    const baseWithRegional = this.rules.fosterCareBaseBenefit * expectedMultiplier;
    
    return budget.monthlyAmount >= baseWithRegional * 0.95; // 5% tolerance
  }

  private checkAgeGroupCompliance(budget: Budget, child: any): boolean {
    const age = this.calculateAge(child.personalInfo.birthDate);
    const ageGroup = this.getAgeGroup(age);
    const expectedMultiplier = this.rules.ageGroupMultipliers[ageGroup];
    const expectedMinimum = this.rules.fosterCareBaseBenefit * expectedMultiplier;
    
    return budget.monthlyAmount >= expectedMinimum * 0.95; // 5% tolerance
  }

  private checkSpecialNeedsCompliance(budget: Budget, child: any): boolean {
    if (!child.specialNeeds.hasSpecialNeeds) return true;
    
    const expectedAdditional = this.rules.fosterCareBaseBenefit * this.rules.specialNeedsMultiplier;
    return (budget.specialNeedsSupport || 0) >= expectedAdditional * 0.9; // 10% tolerance
  }

  private checkDocumentationCompliance(placement: any): boolean {
    // Simplified check - would verify required documents
    return placement.child.legalStatus.courtOrder && 
           placement.child.legalStatus.legalGuardian &&
           placement.child.personalInfo.birthCertificate;
  }

  private createFailedResult(errors: string[]): BudgetValidationResult {
    return {
      isValid: false,
      errors,
      warnings: [],
      calculatedValues: {
        baseBenefit: 0,
        specialNeedsSupport: 0,
        siblingSupport: 0,
        healthcareSupport: 0,
        educationSupport: 0,
        clothingSupport: 0,
        transportSupport: 0,
        totalMonthly: 0,
        totalAnnual: 0
      },
      complianceChecks: {
        minimumWageCompliance: false,
        maximumBenefitCompliance: false,
        regionalCompliance: false,
        ageGroupCompliance: false,
        specialNeedsCompliance: false,
        documentationCompliance: false
      },
      recommendations: []
    };
  }

  /**
   * Generates a comprehensive budget compliance report
   */
  async generateComplianceReport(): Promise<{
    summary: {
      totalPlacements: number;
      compliantPlacements: number;
      nonCompliantPlacements: number;
      complianceRate: number;
      totalBudgetAllocated: number;
      averageBenefit: number;
    };
    violations: Array<{
      type: string;
      count: number;
      impact: 'low' | 'medium' | 'high';
      description: string;
    }>;
    recommendations: string[];
  }> {
    const validationResults = await this.validateAllPlacements();
    
    const summary = {
      totalPlacements: validationResults.total,
      compliantPlacements: validationResults.compliant,
      nonCompliantPlacements: validationResults.nonCompliant,
      complianceRate: (validationResults.compliant / validationResults.total) * 100,
      totalBudgetAllocated: 0, // Would calculate from actual data
      averageBenefit: 0 // Would calculate from actual data
    };

    const violations = this.analyzeViolations(validationResults.results);
    const recommendations = this.generateSystemRecommendations(validationResults.results);

    return {
      summary,
      violations,
      recommendations
    };
  }

  private analyzeViolations(results: Array<{ placementId: string; result: BudgetValidationResult }>): Array<{
    type: string;
    count: number;
    impact: 'low' | 'medium' | 'high';
    description: string;
  }> {
    const violationCounts: Record<string, number> = {};
    
    results.forEach(({ result }) => {
      result.errors.forEach(error => {
        const violationType = this.categorizeViolation(error);
        violationCounts[violationType] = (violationCounts[violationType] || 0) + 1;
      });
    });

    return Object.entries(violationCounts).map(([type, count]) => ({
      type,
      count,
      impact: this.getViolationImpact(type),
      description: this.getViolationDescription(type)
    }));
  }

  private categorizeViolation(error: string): string {
    if (error.includes('salário mínimo')) return 'minimum_wage';
    if (error.includes('benefício máximo')) return 'maximum_benefit';
    if (error.includes('necessidades especiais')) return 'special_needs';
    if (error.includes('regional')) return 'regional_compliance';
    return 'general';
  }

  private getViolationImpact(type: string): 'low' | 'medium' | 'high' {
    const impactMap: Record<string, 'low' | 'medium' | 'high'> = {
      'minimum_wage': 'high',
      'maximum_benefit': 'medium',
      'special_needs': 'high',
      'regional_compliance': 'medium',
      'general': 'low'
    };
    return impactMap[type] || 'low';
  }

  private getViolationDescription(type: string): string {
    const descriptions: Record<string, string> = {
      'minimum_wage': 'Benefícios abaixo do salário mínimo brasileiro',
      'maximum_benefit': 'Benefícios acima do limite máximo estabelecido',
      'special_needs': 'Suporte inadequado para necessidades especiais',
      'regional_compliance': 'Não aplicação de multiplicadores regionais',
      'general': 'Outras não conformidades gerais'
    };
    return descriptions[type] || 'Violação não categorizada';
  }

  private generateSystemRecommendations(results: Array<{ placementId: string; result: BudgetValidationResult }>): string[] {
    const recommendations = [
      'Implementar verificação automática de conformidade com salário mínimo',
      'Configurar multiplicadores regionais automáticos baseados no CEP',
      'Criar alertas para suporte inadequado a necessidades especiais',
      'Estabelecer revisão trimestral de todos os benefícios',
      'Implementar auditoria automática de conformidade com ECA'
    ];

    const commonIssues = this.identifyCommonIssues(results);
    commonIssues.forEach(issue => {
      recommendations.push(`Ação prioritária: ${issue}`);
    });

    return recommendations;
  }

  private identifyCommonIssues(results: Array<{ placementId: string; result: BudgetValidationResult }>): string[] {
    const issues: string[] = [];
    
    const minWageViolations = results.filter(r => 
      r.result.errors.some(e => e.includes('salário mínimo'))
    ).length;
    
    if (minWageViolations > results.length * 0.3) {
      issues.push('Mais de 30% dos benefícios estão abaixo do salário mínimo');
    }

    const specialNeedsIssues = results.filter(r => 
      r.result.warnings.some(w => w.includes('necessidades especiais'))
    ).length;
    
    if (specialNeedsIssues > 0) {
      issues.push('Crianças com necessidades especiais não estão recebendo suporte adequado');
    }

    return issues;
  }
}

export const brazilianBudgetValidator = new BrazilianBudgetValidator();